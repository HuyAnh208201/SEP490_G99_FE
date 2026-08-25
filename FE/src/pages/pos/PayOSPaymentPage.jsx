import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import {
  cancelPaymentLink as apiCancelPaymentLink,
  createPaymentLink as apiCreatePaymentLink,
  fetchPaymentStatus as apiFetchPaymentStatus,
} from '../../api/payments.js';
import PosOrderTable from './components/PosOrderTable.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';
import { openCustomerDisplay, publishCustomerDisplay } from './customerDisplayChannel.js';

/**
 * payOS chỉ gọi webhook được vào URL công khai, máy quầy thì không — nên FE hỏi
 * trạng thái theo chu kỳ. Server vẫn là nơi chốt đơn khi payOS trả PAID.
 */
const POLL_INTERVAL_MS = 3000;

function StatusBanner({ status }) {
  const tone = {
    CREATING: ['#0058be', 'CREATING PAYMENT LINK…'],
    PENDING: ['#0058be', 'PAYOS — AWAITING CUSTOMER SCAN'],
    PAID: ['#128a3c', 'PAYMENT RECEIVED'],
    CANCELLED: ['#b42318', 'PAYMENT LINK CANCELLED'],
    EXPIRED: ['#b42318', 'PAYMENT LINK EXPIRED'],
    FAILED: ['#b42318', 'PAYMENT FAILED'],
  }[status] ?? ['#0058be', status];

  const [color, label] = tone;
  const pulsing = status === 'CREATING' || status === 'PENDING';

  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold"
      style={{ borderColor: `${color}26`, backgroundColor: `${color}0d`, color }}
    >
      <span
        className={`h-2 w-2 rounded-full ${pulsing ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-[var(--admin-muted)]">{label}</span>
      <span className="text-right text-sm font-semibold text-[var(--admin-text)] break-all">
        {value}
      </span>
    </div>
  );
}

export default function PayOSPaymentPage() {
  const navigate = useNavigate();
  const {
    lines,
    totals,
    createPayOSOrder,
    finishPayOSOrder,
  } = usePosCart();

  const [status, setStatus] = useState('CREATING');
  const [order, setOrder] = useState(null);
  const [link, setLink] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [transactionRef, setTransactionRef] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  /** StrictMode chạy effect hai lần — không được tạo hai đơn cho một giỏ. */
  const startedRef = useRef(false);
  /** Chốt đơn vào lịch sử đúng một lần khi payOS báo PAID. */
  const settledRef = useRef(false);
  const amountDue = link ? Number(link.amount) : totals.total;

  // 1. Tạo đơn PENDING_PAYMENT rồi xin payOS link + QR.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const created = await createPayOSOrder();
      if (!created.ok) {
        setStatus('FAILED');
        setError(created.message || 'Could not create the order');
        return;
      }
      setOrder(created.order);
      try {
        const payment = await apiCreatePaymentLink(created.order.id);
        setLink(payment);
        setStatus(payment.status || 'PENDING');
      } catch (err) {
        // Đơn đã nằm trong DB ở trạng thái PENDING_PAYMENT — cashier phải huỷ
        // để server hoàn kho, nên vẫn giữ orderId trên màn hình.
        setStatus('FAILED');
        setError(err.message || 'Could not create the payment link');
      }
    })();
  }, [createPayOSOrder]);

  // 2. payOS trả chuỗi VietQR — vẽ thành ảnh QR ngay trên máy quầy.
  useEffect(() => {
    if (!link?.qrCode) return undefined;
    let stale = false;
    QRCode.toDataURL(link.qrCode, { width: 320, margin: 1 })
      .then((url) => {
        if (!stale) setQrDataUrl(url);
      })
      .catch(() => {
        if (!stale) setError('Could not render the QR code');
      });
    return () => {
      stale = true;
    };
  }, [link]);

  useEffect(() => {
    publishCustomerDisplay({
      status,
      qrCode: link?.qrCode,
      amount: amountDue,
      itemCount: totals.itemCount,
      discount: totals.promoSavings + totals.codeDiscount + totals.pointsDiscount,
      invoiceCode: order?.invoiceCode,
      orderCode: link?.orderCode,
    });
  }, [amountDue, link?.orderCode, link?.qrCode, order?.invoiceCode, status, totals]);

  // 3. Hỏi trạng thái tới khi payOS chốt (PAID / CANCELLED / EXPIRED).
  useEffect(() => {
    if (status !== 'PENDING' || !link) return undefined;
    let stopped = false;

    const timer = setInterval(async () => {
      try {
        const result = await apiFetchPaymentStatus(link.orderCode);
        if (stopped || !result?.status || result.status === 'PENDING') return;
        setTransactionRef(result.transactionRef ?? null);
        setStatus(result.status);
      } catch {
        // Mạng chập chờn hoặc payOS lỗi tạm thời — để lần poll sau thử lại,
        // không đá cashier ra khỏi màn hình đang chờ tiền.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [status, link]);

  // 4. Đã nhận tiền → dọn giỏ rồi về màn bán hàng kèm popup thành công.
  useEffect(() => {
    if (status !== 'PAID' || settledRef.current) return;
    settledRef.current = true;
    finishPayOSOrder(order);
    navigate('/pos', {
      replace: true,
      state: {
        completedInvoice: order?.invoiceCode,
        completedOrder: order,
      },
    });
  }, [status, order, finishPayOSOrder, navigate]);

  async function checkNow() {
    if (!link) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiFetchPaymentStatus(link.orderCode);
      setTransactionRef(result.transactionRef ?? null);
      if (result?.status) setStatus(result.status);
    } catch (err) {
      setError(err.message || 'Could not check the payment status');
    } finally {
      setBusy(false);
    }
  }

  /** Huỷ link để server hoàn kho và đảo điểm; giỏ vẫn còn nguyên để bán lại. */
  async function cancelPayment() {
    // Chưa tạo được link, hoặc payOS đã đóng link (CANCELLED/EXPIRED) — lúc đó
    // lần poll cuối đã nhả đơn rồi, gọi hủy lần nữa chỉ ăn lỗi từ payOS.
    if (!link || status !== 'PENDING') {
      navigate('/pos');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiCancelPaymentLink(link.orderCode);
      publishCustomerDisplay({
        status: 'CANCELLED',
        amount: amountDue,
        itemCount: totals.itemCount,
        discount: totals.promoSavings + totals.codeDiscount + totals.pointsDiscount,
        invoiceCode: order?.invoiceCode,
        orderCode: link.orderCode,
      });
      navigate('/pos', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not cancel the payment link');
      setBusy(false);
    }
  }

  // Giỏ trống mà cũng chưa có đơn nào được tạo → vào thẳng URL này, quay lại POS.
  if (!lines.length && !link && !order) return <Navigate to="/pos" replace />;

  if (status === 'PAID') {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <PosPageTitle title="PayOS Payment" />
        <div className="space-y-4">
          <StatusBanner status={status} />

          <section className="rounded-xl border border-[var(--admin-border)] bg-white px-5 py-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#128a3c]/10 text-[#128a3c]">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--admin-text)]">
                {formatVnd(amountDue)}
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--admin-muted)]">
                Transferred successfully via PayOS
              </p>
            </div>

            <div className="mt-5 divide-y divide-[var(--admin-border)] border-t border-[var(--admin-border)] pt-2">
              <DetailRow label="Invoice code" value={order?.invoiceCode ?? '—'} />
              <DetailRow label="PayOS order code" value={link?.orderCode ?? '—'} />
              <DetailRow label="Transaction reference" value={transactionRef ?? '—'} />
              <DetailRow label="Payment status" value="PAID" />
            </div>
          </section>

          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => navigate('/pos', { replace: true })}
              className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-muted)] hover:bg-[#f7f9fb]"
            >
              New Order
            </button>
            <button
              type="button"
              onClick={() =>
                navigate('/pos/history', {
                  replace: true,
                  state: {
                    completedInvoice: order?.invoiceCode,
                    completedOrder: order,
                  },
                })
              }
              className="rounded-lg bg-[var(--admin-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)]"
            >
              View Order History
            </button>
          </div>
        </div>
      </main>
    );
  }

  const closed = status === 'CANCELLED' || status === 'EXPIRED' || status === 'FAILED';

  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="PayOS Payment" />

      <div className="space-y-4">
        <StatusBanner status={status} />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCustomerDisplay}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--admin-brand)] hover:bg-[#f7f9fb]"
          >
            Open customer display
          </button>
        </div>

        <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
              Product cart
            </h2>
          </div>
          <PosOrderTable lines={lines} />
        </section>

        <section className="rounded-xl border border-[var(--admin-border)] bg-white px-5 py-6 shadow-[var(--shadow-card)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Payment QR code
          </p>
          <div className="mt-4 flex flex-col items-center text-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="PayOS payment QR code"
                className="h-48 w-48 rounded-lg border border-[var(--admin-border)] bg-white p-2"
              />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[#f7f9fb] text-xs font-medium text-[var(--admin-subtle)]">
                {closed ? 'QR code unavailable' : 'Generating QR code…'}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3 text-xs text-[var(--admin-subtle)]">
              <span>{totals.itemCount} items</span>
              {totals.promoSavings + totals.pointsDiscount > 0 ? (
                <span>
                  Discount {formatVnd(totals.promoSavings + totals.pointsDiscount)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">Amount to pay</p>
            <p className="mt-1 text-2xl font-bold text-[var(--admin-text)]">
              {formatVnd(amountDue)}
            </p>
            {link && (
              <div className="mt-3 space-y-1 text-xs text-[var(--admin-subtle)]">
                <p>
                  PayOS order code:{' '}
                  <span className="font-semibold text-[var(--admin-muted)]">{link.orderCode}</span>
                </p>
                <a
                  href={link.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-semibold text-[var(--admin-brand)] hover:underline"
                >
                  Open PayOS checkout page ↗
                </a>
              </div>
            )}
            {status === 'PENDING' && (
              <button
                type="button"
                disabled={busy}
                onClick={checkNow}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {busy ? 'Checking…' : 'Check payment status'}
              </button>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            disabled={busy}
            onClick={cancelPayment}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {closed ? '← Back to Cart' : 'Cancel Payment'}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-right text-sm text-[var(--admin-danger)]">{error}</p>
        )}

        {status === 'FAILED' && order && (
          // Đơn đã ghi vào DB và đã trừ kho nhưng không có link để huỷ — phải có
          // người vào sửa, nếu không tồn kho sẽ lệch.
          <p className="text-right text-xs text-[var(--admin-danger)]">
            Order {order.invoiceCode} is still awaiting payment and its stock is already
            deducted. Ask a branch manager to void it.
          </p>
        )}
      </div>
    </main>
  );
}
