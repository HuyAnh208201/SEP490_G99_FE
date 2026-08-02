import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { formatMoneyInput, formatVnd, parseMoneyInput } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import PosCartPanel from './components/PosCartPanel.jsx';
import { isTypingTarget } from './posHotkeys.js';

const METHODS = [
  { id: 'cash', label: 'Cash', hint: 'Receive cash & return change · shortcut 1' },
  { id: 'payos', label: 'PayOS', hint: 'Customer pays via PayOS QR · shortcut 2' },
];

export default function PosPaymentPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    lines,
    totals,
    customer,
    appliedVoucher,
    checkoutBusy,
    completeCashPayment,
  } = usePosCart();

  const initialMethod = searchParams.get('method') === 'payos' ? 'payos' : 'cash';
  const [method, setMethod] = useState(initialMethod);

  const [receivedRaw, setReceivedRaw] = useState('');
  const [cashError, setCashError] = useState('');
  const received = parseMoneyInput(receivedRaw) ?? 0;
  const change = Math.max(0, received - totals.total);
  const quickAmounts = useMemo(() => {
    const rounded = Math.ceil(totals.total / 50000) * 50000;
    return [...new Set([totals.total, rounded, 200000, 500000])]
      .filter((amount) => amount >= totals.total)
      .slice(0, 4);
  }, [totals.total]);

  useEffect(() => {
    const next = searchParams.get('method') === 'payos' ? 'payos' : 'cash';
    setMethod(next);
  }, [searchParams]);

  function selectMethod(next) {
    setMethod(next);
    setSearchParams(next === 'cash' ? {} : { method: next }, { replace: true });
    setCashError('');
  }

  function openPayOsCheckout() {
    navigate('/pos/payment/payos');
  }

  async function completeCash() {
    const parsed = parseMoneyInput(receivedRaw);
    if (parsed == null || !Number.isFinite(parsed) || parsed < 0) {
      setCashError('Enter a valid cash received amount.');
      return;
    }
    if (parsed < totals.total) {
      setCashError('Cash received is less than the amount due.');
      return;
    }
    const result = await completeCashPayment({ receivedAmount: parsed, paymentMethod: 'CASH' });
    if (!result.ok) {
      setCashError(result.message);
      return;
    }
    navigate('/pos', {
      replace: true,
      state: {
        completedInvoice: result.order.invoiceCode,
        change: result.change,
      },
    });
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        navigate('/pos');
        return;
      }
      if (event.key === '1' && !isTypingTarget(event.target)) {
        event.preventDefault();
        selectMethod('cash');
        return;
      }
      if (event.key === '2' && !isTypingTarget(event.target)) {
        event.preventDefault();
        selectMethod('payos');
        return;
      }
      if (event.key !== 'F4') return;
      event.preventDefault();
      if (method === 'cash') completeCash();
      else openPayOsCheckout();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!lines.length) return <Navigate to="/pos" replace />;

  function setReceivedAmount(amount) {
    setReceivedRaw(formatMoneyInput(amount));
    setCashError('');
  }

  function appendCashDigit(digit) {
    const digits = String(receivedRaw).replace(/[^\d]/g, '') + String(digit);
    const next = Number(digits);
    if (!Number.isFinite(next)) return;
    setReceivedAmount(Math.min(next, 99_999_999));
  }

  function backspaceCash() {
    const digits = String(receivedRaw).replace(/[^\d]/g, '').slice(0, -1);
    if (!digits) {
      setReceivedRaw('');
      setCashError('');
      return;
    }
    setReceivedAmount(Number(digits));
  }

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--admin-border)] bg-white px-3 py-2.5 lg:px-4">
        <button
          type="button"
          onClick={() => navigate('/pos')}
          className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
        >
          ← Cart
        </button>
        <h1 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--admin-text)]">Payment</h1>
        <p className="ml-auto text-xs text-[var(--admin-subtle)]">
          {METHODS.find((item) => item.id === method)?.hint}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 lg:p-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-h-0 overflow-y-auto rounded-2xl border border-[var(--admin-border)] bg-white p-3 shadow-[var(--shadow-card)] lg:p-4">
          <div className="mx-auto flex h-full max-w-3xl flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">Due</p>
                <p className="mt-0.5 truncate text-lg font-extrabold text-[var(--admin-brand)]">
                  {formatVnd(totals.total)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">Received</p>
                <p className="mt-0.5 truncate text-lg font-extrabold text-[var(--admin-text)]">
                  {method === 'cash' && receivedRaw ? formatVnd(received) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">Change</p>
                <p
                  className={`mt-0.5 truncate text-lg font-extrabold ${
                    method === 'cash' && received >= totals.total
                      ? 'text-[var(--admin-success)]'
                      : 'text-[var(--admin-subtle)]'
                  }`}
                >
                  {method === 'cash' && receivedRaw ? formatVnd(change) : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectMethod(item.id)}
                  className={`inline-flex min-h-[3.5rem] items-center justify-center gap-2 rounded-xl border-2 px-4 text-base font-bold transition sm:min-h-[4rem] sm:text-lg ${
                    method === item.id
                      ? 'border-[var(--admin-brand)] bg-[var(--admin-brand)] text-white shadow-sm'
                      : 'border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:border-[#0058be]/40 hover:bg-[#0058be]/5'
                  }`}
                >
                  {item.label}
                  <kbd
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      method === item.id ? 'bg-white/20' : 'bg-[#e8eef5] text-[var(--admin-brand)]'
                    }`}
                  >
                    {index + 1}
                  </kbd>
                </button>
              ))}
            </div>

            {method === 'cash' ? (
              <>
              <div className="relative">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={receivedRaw}
                  onChange={(event) => {
                    setReceivedRaw(event.target.value);
                    setCashError('');
                  }}
                  placeholder="Cash received"
                  className="w-full rounded-xl border-2 border-[var(--admin-border)] bg-[#fbfcfe] py-3 pl-4 pr-14 text-2xl font-bold tabular-nums outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--admin-muted)]">
                  VND
                </span>
              </div>
              {cashError && <p className="-mt-1 text-sm text-[var(--admin-danger)]">{cashError}</p>}

              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setReceivedAmount(amount)}
                    className="rounded-xl border border-[var(--admin-border)] bg-white px-2 py-2.5 text-xs font-bold transition hover:border-[#0058be]/40 hover:bg-[#0058be]/5 hover:text-[var(--admin-brand)] sm:text-sm"
                  >
                    {formatVnd(amount)}
                  </button>
                ))}
              </div>

              <div className="grid flex-1 grid-cols-3 gap-2 content-start">
                {numpadKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === '⌫') backspaceCash();
                      else appendCashDigit(key);
                    }}
                    className={`min-h-[3.25rem] rounded-xl border text-xl font-bold transition sm:min-h-[3.75rem] ${
                      key === '⌫'
                        ? 'border-[var(--admin-border)] bg-[#f0f4f8] text-[var(--admin-muted)] hover:bg-[#e8eef5]'
                        : 'border-[var(--admin-border)] bg-white text-[var(--admin-text)] hover:border-[#0058be]/35 hover:bg-[#0058be]/5'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="mt-auto grid grid-cols-[1fr_1.4fr] gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setReceivedRaw('');
                    setCashError('');
                  }}
                  className="min-h-12 rounded-xl border border-[var(--admin-border)] bg-white text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={received < totals.total || checkoutBusy}
                  onClick={completeCash}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--admin-brand)] px-4 text-sm font-bold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Confirm cash
                  <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">F4</kbd>
                </button>
              </div>
              </>
            ) : (
              <>
              <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
                  PayOS checkout
                </p>
                <p className="mt-1 text-3xl font-extrabold text-[var(--admin-brand)]">{formatVnd(totals.total)}</p>
                <p className="mt-2 text-sm text-[var(--admin-muted)]">
                  Continues to the PayOS screen with a real VietQR code and automatic payment polling.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--admin-border)] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">Gateway</p>
                  <p className="mt-1 text-sm font-semibold">PayOS · VietQR</p>
                </div>
                <div className="rounded-xl border border-[var(--admin-border)] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">Items</p>
                  <p className="mt-1 text-sm font-semibold">{totals.itemCount}</p>
                </div>
              </div>

              <div className="mt-auto grid gap-2 pt-2">
                <button
                  type="button"
                  disabled={checkoutBusy || !lines.length}
                  onClick={openPayOsCheckout}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[var(--admin-brand)] px-4 text-base font-bold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Open PayOS QR
                  <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">F4</kbd>
                </button>
              </div>
              </>
            )}
          </div>
        </section>

        <div className="hidden min-h-0 xl:block">
          <PosCartPanel
            readOnly
            className="h-full"
            lines={lines}
            totals={totals}
            customer={customer}
            appliedVoucher={appliedVoucher}
          />
        </div>
      </div>

      <div className="border-t border-[var(--admin-border)] bg-white p-3 xl:hidden">
        <details className="group overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
            <span>Current order · {totals.itemCount} items · {formatVnd(totals.total)}</span>
            <span className="text-xs text-[var(--admin-subtle)] group-open:hidden">Show</span>
            <span className="hidden text-xs text-[var(--admin-subtle)] group-open:inline">Hide</span>
          </summary>
          <div className="max-h-[48vh] overflow-y-auto border-t border-[var(--admin-border)]">
            <PosCartPanel
              readOnly
              className="rounded-none border-0 shadow-none"
              lines={lines}
              totals={totals}
              customer={customer}
              appliedVoucher={appliedVoucher}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
