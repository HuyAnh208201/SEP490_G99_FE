import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import OrderSummary from './components/OrderSummary.jsx';
import PosOrderTable from './components/PosOrderTable.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';

const QR_CELLS = [
  [8, 1], [10, 1], [12, 1], [14, 1], [8, 2], [9, 2], [12, 2], [15, 2],
  [9, 3], [11, 3], [13, 3], [15, 3], [8, 4], [10, 4], [11, 4], [14, 4],
  [1, 8], [3, 8], [5, 8], [8, 8], [9, 8], [11, 8], [13, 8], [15, 8], [17, 8], [19, 8],
  [2, 9], [5, 9], [7, 9], [10, 9], [12, 9], [13, 9], [16, 9], [18, 9],
  [1, 10], [4, 10], [6, 10], [8, 10], [11, 10], [14, 10], [17, 10], [19, 10],
  [2, 11], [3, 11], [6, 11], [9, 11], [10, 11], [12, 11], [15, 11], [18, 11],
  [1, 12], [4, 12], [7, 12], [8, 12], [11, 12], [13, 12], [16, 12], [19, 12],
  [2, 13], [5, 13], [7, 13], [10, 13], [14, 13], [15, 13], [18, 13],
  [1, 14], [3, 14], [6, 14], [8, 14], [9, 14], [12, 14], [16, 14], [19, 14],
  [8, 15], [10, 15], [13, 15], [15, 15], [18, 15], [9, 16], [11, 16], [14, 16], [16, 16],
  [8, 17], [12, 17], [13, 17], [17, 17], [19, 17], [9, 18], [10, 18], [14, 18], [18, 18],
  [8, 19], [11, 19], [13, 19], [15, 19], [16, 19], [19, 19],
];

function Finder({ x, y }) {
  return (
    <>
      <rect x={x} y={y} width="7" height="7" fill="#191c1e" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#191c1e" />
    </>
  );
}

function DemoQrCode() {
  return (
    <svg
      viewBox="0 0 21 21"
      className="h-48 w-48 rounded-lg border border-[var(--admin-border)] bg-white p-2"
      shapeRendering="crispEdges"
      aria-label="Demo PayOS QR code"
    >
      <rect width="21" height="21" fill="white" />
      <Finder x={0} y={0} />
      <Finder x={14} y={0} />
      <Finder x={0} y={14} />
      {QR_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#191c1e" />
      ))}
    </svg>
  );
}

export default function PayOSPaymentPage() {
  const navigate = useNavigate();
  const {
    lines,
    totals,
    appliedCode,
    checkoutBusy,
    completeCashPayment,
  } = usePosCart();
  const [error, setError] = useState('');

  if (!lines.length) return <Navigate to="/pos" replace />;

  async function confirmReceived() {
    setError('');
    const result = await completeCashPayment({
      receivedAmount: totals.total,
      paymentMethod: 'PAYOS',
    });
    if (!result.ok) {
      setError(result.message || 'Could not complete the payment');
      return;
    }
    navigate('/pos/history', {
      replace: true,
      state: { completedInvoice: result.order.invoiceCode },
    });
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="PayOS Payment" />

      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-[#0058be]/15 bg-[#0058be]/5 px-4 py-3 text-sm font-semibold text-[var(--admin-brand)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--admin-brand)]" />
          PAYOS — AWAITING CUSTOMER SCAN
        </div>

        <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
              Product cart
            </h2>
          </div>
          <PosOrderTable lines={lines} />
        </section>

        <OrderSummary totals={totals} appliedCode={appliedCode} />

        <section className="rounded-xl border border-[var(--admin-border)] bg-white px-5 py-6 shadow-[var(--shadow-card)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Payment QR code
          </p>
          <div className="mt-4 flex flex-col items-center text-center">
            <DemoQrCode />
            <p className="mt-3 text-xl font-bold text-[var(--admin-text)]">
              {formatVnd(totals.total)}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--admin-muted)]">
              Account: Convenience Store Chain
            </p>
            <p className="mt-1 text-xs text-[var(--admin-subtle)]">
              Demo QR · PayOS API will replace this code in backend phase
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M8 21h8M12 19v2" strokeLinecap="round" />
              </svg>
              Show on Customer Display
            </button>
          </div>
        </section>

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
            disabled={checkoutBusy}
            onClick={confirmReceived}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" strokeLinejoin="round" />
            </svg>
            Payment Received — Print Receipt
          </button>
        </div>
        {error && (
          <p className="mt-3 text-right text-sm text-[var(--admin-danger)]">{error}</p>
        )}
      </div>
    </main>
  );
}
