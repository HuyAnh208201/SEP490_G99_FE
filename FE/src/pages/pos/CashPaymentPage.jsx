import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { formatMoneyInput, formatVnd, parseMoneyInput } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import OrderSummary from './components/OrderSummary.jsx';
import PosOrderTable from './components/PosOrderTable.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';

export default function CashPaymentPage() {
  const navigate = useNavigate();
  const {
    lines,
    totals,
    appliedCode,
    checkoutBusy,
    completeCashPayment,
  } = usePosCart();
  const [receivedRaw, setReceivedRaw] = useState('');
  const [error, setError] = useState('');

  const received = parseMoneyInput(receivedRaw) ?? 0;
  const change = Math.max(0, received - totals.total);
  const quickAmounts = useMemo(() => {
    const rounded = Math.ceil(totals.total / 50000) * 50000;
    return [...new Set([totals.total, rounded, 200000, 500000])].filter(
      (amount) => amount >= totals.total,
    ).slice(0, 4);
  }, [totals.total]);

  if (!lines.length) return <Navigate to="/pos" replace />;

  async function complete() {
    const result = await completeCashPayment({ receivedAmount: received });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate('/pos/history', {
      replace: true,
      state: {
        completedInvoice: result.order.invoiceCode,
        change: result.change,
      },
    });
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="Cash Payment" />

      <div className="space-y-4">
        <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-xl border border-[#0058be]/15 bg-[#0058be]/5 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
                Total amount due
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--admin-brand)]">
                {formatVnd(totals.total)}
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
                Cash received
              </label>
              <div className="relative mt-1.5">
                <input
                  autoFocus
                  inputMode="numeric"
                  value={receivedRaw}
                  onChange={(event) => {
                    setReceivedRaw(event.target.value);
                    setError('');
                  }}
                  placeholder="Please enter the cash received from customer"
                  className="w-full rounded-lg border border-[var(--admin-border)] py-3 pl-4 pr-14 text-lg font-semibold outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--admin-muted)]">
                  VND
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
              Quick select
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setReceivedRaw(formatMoneyInput(amount))}
                  className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-3 text-sm font-semibold transition hover:border-[#0058be]/40 hover:bg-[#0058be]/5 hover:text-[var(--admin-brand)]"
                >
                  {formatVnd(amount)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
              Change to return
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                received >= totals.total ? 'text-[var(--admin-success)]' : 'text-[var(--admin-subtle)]'
              }`}
            >
              {receivedRaw ? formatVnd(change) : '—'}
            </p>
          </div>
          {error && <p className="mt-2 text-sm text-[var(--admin-danger)]">{error}</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
              Product cart
            </h2>
          </div>
          <PosOrderTable lines={lines} />
        </section>

        <OrderSummary totals={totals} appliedCode={appliedCode} />

        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-muted)] hover:bg-[#f7f9fb]"
          >
            ← Change Payment
          </button>
          <button
            type="button"
            disabled={received < totals.total || checkoutBusy}
            onClick={complete}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" strokeLinejoin="round" />
            </svg>
            Confirm & Print Receipt
          </button>
        </div>
      </div>
    </main>
  );
}
