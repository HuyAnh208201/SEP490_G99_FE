import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatVnd } from '../../lib/money.js';
import { fetchOrdersPage, requestRefund } from '../../api/posOrders.js';
import { openReceiptPdf } from '../../lib/posReceiptPdf.js';
import Modal from '../../components/ui/Modal.jsx';
import Button from '../../components/ui/Button.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

/** Cashier chỉ được xin hoàn đơn trong 5 phút kể từ khi đơn tạo. */
const REFUND_WINDOW_MS = 5 * 60 * 1000;

function formatWhen(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/** Đếm ngược mm:ss (kẹp về 00:00 khi hết giờ). */
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function OrderHistoryPage() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('ALL');
  const [date, setDate] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  // Đồng hồ đếm giây để cập nhật đếm ngược và tự ẩn nút khi hết cửa sổ 5 phút.
  const [now, setNow] = useState(() => Date.now());
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundNotice, setRefundNotice] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchOrdersPage, {
    search: debouncedQuery,
    paymentMethod: method,
    from: date || undefined,
    to: date || undefined,
  });
  const { items: orderHistory, loading: orderHistoryLoading } = pageData;
  const loadOrderHistory = useCallback(async () => {
    pageData.reload();
    return { ok: true };
  }, [pageData.reload]);

  useEffect(() => {
    (async () => {
      const result = await loadOrderHistory();
      if (!result.ok) setError(result.message);
    })();
  }, [loadOrderHistory]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function openRefund(order) {
    setRefundOrder(order);
    setRefundReason('');
    setRefundError('');
  }

  function closeRefund() {
    if (refundSubmitting) return;
    setRefundOrder(null);
    setRefundReason('');
    setRefundError('');
  }

  async function submitRefund() {
    if (refundSubmitting || !refundOrder) return;
    const reason = refundReason.trim();
    if (!reason) {
      setRefundError('Please enter a reason for the refund.');
      return;
    }
    setRefundSubmitting(true);
    setRefundError('');
    try {
      await requestRefund(refundOrder.id, reason);
      setRefundOrder(null);
      setRefundReason('');
      setRefundNotice('Refund completed. Stock and loyalty points were adjusted automatically.');
      const result = await loadOrderHistory();
      if (!result.ok) setError(result.message);
    } catch (err) {
      setRefundError(err?.message || 'Could not complete the refund.');
    } finally {
      setRefundSubmitting(false);
    }
  }

  const filteredOrders = orderHistory;

  const selected =
    orderHistory.find((order) => order.id === selectedId) ??
    filteredOrders[0] ??
    null;

  // OrderItemResponse (BE) → shape mà bảng chi tiết bên dưới đang dùng.
  const detailLines = (selected?.lines ?? []).map((line) => ({
    key: String(line.id ?? line.productId),
    name: line.productName,
    qty: line.quantity,
    unitPrice: Number(line.unitPrice),
    refundable: line.refundable !== false,
  }));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="Order History" />

      {location.state?.completedInvoice && (
        <div className="mb-4 rounded-xl border border-[var(--admin-success)]/20 bg-[#0d7a3e]/5 px-4 py-3 text-sm text-[var(--admin-success)]">
          <span className="font-semibold">{location.state.completedInvoice}</span> completed successfully.
          {location.state.change != null && ` Change returned: ${formatVnd(location.state.change)}.`}
        </div>
      )}

      {refundNotice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-[var(--admin-success)]/20 bg-[#0d7a3e]/5 px-4 py-3 text-sm text-[var(--admin-success)]">
          <span>{refundNotice}</span>
          <button
            type="button"
            onClick={() => setRefundNotice('')}
            className="shrink-0 font-semibold text-[var(--admin-success)]/80 hover:text-[var(--admin-success)]"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap gap-2 border-b border-[var(--admin-border)] p-4">
            <div className="relative min-w-[220px] flex-1">
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle)]" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search invoice ID or customer..."
                className="w-full rounded-lg border border-[var(--admin-border)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
              />
            </div>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-muted)] outline-none focus:border-[var(--admin-brand)]"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="PAYOS">PayOS</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-muted)] outline-none focus:border-[var(--admin-brand)]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-[11px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
              <tr>
                <th className="px-4 py-3">Invoice ID</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Refund</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedId(order.id)}
                  className={`cursor-pointer border-t border-[var(--admin-border)] transition hover:bg-[#f7f9fb] ${
                    selected?.id === order.id ? 'bg-[#0058be]/5' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-[var(--admin-brand)]">
                    {order.invoiceCode}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{formatWhen(order.createdAt)}</td>
                  <td className="px-4 py-3">{order.customerName || 'Walk-in'}</td>
                  <td className="px-4 py-3">{order.itemCount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#0058be]/10 px-2 py-0.5 text-xs font-semibold text-[var(--admin-brand)]">
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatVnd(order.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.status === 'REFUNDED' ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Refunded
                      </span>
                    ) : order.refundable === false ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Non-refundable
                      </span>
                    ) : (() => {
                      const remainingMs =
                        new Date(order.createdAt).getTime() + REFUND_WINDOW_MS - now;
                      const canRefund = order.status === 'COMPLETED' && remainingMs > 0;
                      if (!canRefund) return <span className="text-[var(--admin-subtle)]">—</span>;
                      return (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openRefund(order);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-brand)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
                        >
                          Refund
                          <span className="tabular-nums text-[var(--admin-subtle)]">
                            {formatCountdown(remainingMs)}
                          </span>
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-subtle)]">
                    No matching orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          <div className="hidden items-center justify-between border-t border-[var(--admin-border)] px-4 py-3 text-xs text-[var(--admin-subtle)]">
            <span>1–{filteredOrders.length} of {orderHistory.length}</span>
            <div className="flex gap-1">
              <button type="button" disabled className="h-8 w-8 rounded-lg border border-[var(--admin-border)] disabled:opacity-40">‹</button>
              <button type="button" className="h-8 w-8 rounded-lg bg-[var(--admin-brand)] font-semibold text-white">1</button>
              <button type="button" disabled className="h-8 w-8 rounded-lg border border-[var(--admin-border)] disabled:opacity-40">›</button>
            </div>
          </div>
          <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={orderHistoryLoading} />
        </section>

        <aside className="space-y-4 xl:sticky xl:top-0">
          <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
              Invoice Detail
            </h2>
            {selected ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Invoice ID</dt><dd className="font-semibold">{selected.invoiceCode}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Date & Time</dt><dd className="text-right">{formatWhen(selected.createdAt)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Cashier</dt><dd>{selected.cashierName || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Customer</dt><dd>{selected.customerName || 'Walk-in'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Payment Method</dt><dd>{selected.paymentMethod}</dd></div>
                {(selected.pointsRedeemed > 0 || selected.pointsEarned > 0) && (
                  <>
                    {selected.pointsRedeemed > 0 ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--admin-subtle)]">Points redeemed</dt>
                        <dd>{selected.pointsRedeemed}</dd>
                      </div>
                    ) : null}
                    {selected.pointsEarned > 0 ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--admin-subtle)]">Points earned</dt>
                        <dd>{selected.pointsEarned}</dd>
                      </div>
                    ) : null}
                  </>
                )}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-[var(--admin-subtle)]">Select an invoice.</p>
            )}
          </section>

          {selected && (
            <>
              <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
                <div className="border-b border-[var(--admin-border)] bg-[#f7f9fb] px-4 py-3">
                  <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                    Product Cart
                  </h2>
                </div>
                <div className="divide-y divide-[var(--admin-border)]">
                  {detailLines.map((line) => (
                    <div key={line.key} className="flex justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{line.name}</p>
                        <p className="text-xs text-[var(--admin-subtle)]">
                          {line.qty} × {formatVnd(line.unitPrice)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            line.refundable
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {line.refundable ? 'Refundable' : 'Non-refundable'}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold">{formatVnd(line.qty * line.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
                <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                  Order Summary
                </h2>
                <div className="mt-4 space-y-1.5 border-t border-[var(--admin-border)] pt-3 text-sm">
                  {(selected.pointsRedeemed > 0 || selected.pointsEarned > 0) && (
                    <>
                      {selected.pointsRedeemed > 0 ? (
                        <div className="flex justify-between text-[var(--admin-muted)]">
                          <span>Points redeemed</span>
                          <span>−{selected.pointsRedeemed}</span>
                        </div>
                      ) : null}
                      {selected.pointsEarned > 0 ? (
                        <div className="flex justify-between text-[var(--admin-muted)]">
                          <span>Points earned</span>
                          <span>+{selected.pointsEarned}</span>
                        </div>
                      ) : null}
                    </>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold">Total Amount Due</span>
                    <span className="text-lg font-bold text-[var(--admin-brand)]">{formatVnd(selected.total)}</span>
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={() => {
                  if (!selected) return;
                  openReceiptPdf(selected).catch((err) => {
                    setError(err?.message || 'Could not generate the receipt.');
                  });
                }}
                className="w-full rounded-lg border border-[var(--admin-brand)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
              >
                Reprint Receipt
              </button>
            </>
          )}
        </aside>
      </div>

      <Modal
        open={Boolean(refundOrder)}
        onClose={closeRefund}
        title="Confirm refund"
        description={
          refundOrder
            ? `Invoice ${refundOrder.invoiceCode} · ${formatVnd(refundOrder.total)}`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeRefund} disabled={refundSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitRefund}
              loading={refundSubmitting}
              disabled={refundSubmitting || !refundReason.trim()}
            >
              Confirm refund
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--admin-muted)]">
            This immediately refunds the full order, restores stock, and adjusts loyalty
            points. Refunds are only allowed within 5 minutes of checkout.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[var(--admin-text)]">
              Reason <span className="text-red-600">*</span>
            </span>
            <textarea
              className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
              rows={4}
              placeholder="Explain why this order needs to be refunded…"
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              autoFocus
            />
          </label>
          {refundError && <p className="text-sm text-red-600">{refundError}</p>}
        </div>
      </Modal>
    </div>
  );
}
