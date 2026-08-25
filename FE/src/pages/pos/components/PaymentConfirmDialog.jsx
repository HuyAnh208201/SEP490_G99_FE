import { useEffect } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import { formatVnd } from '../../../lib/money.js';

function SummaryRow({ label, value, strong = false, tone = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'border-t border-[var(--admin-border)] pt-3 text-base font-bold' : 'text-sm'} ${tone}`}>
      <span>{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function PaymentConfirmDialog({
  open,
  review,
  lines,
  totals,
  busy,
  error,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'n') {
        event.preventDefault();
        if (!busy) onClose();
        return;
      }
      if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        if (!busy) onConfirm();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose, onConfirm, open]);

  if (!review) return null;

  const isCash = review.method === 'cash';

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="Review payment"
      size="lg"
      layer={70}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[#f7f9fb] px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--admin-muted)]">Products</h3>
            <span className="text-xs font-semibold text-[var(--admin-subtle)]">{totals.itemCount} items</span>
          </div>
          <ul className="max-h-72 divide-y divide-[var(--admin-border)] overflow-y-auto">
            {lines.map((line) => (
              <li key={line.key} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--admin-text)]">{line.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-subtle)]">
                    {line.qty} × {formatVnd(line.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-[var(--admin-text)]">
                  {formatVnd(line.qty * line.unitPrice)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-xl border border-[var(--admin-border)] bg-[#fbfcfe] p-4">
          <SummaryRow label="Payment method" value={isCash ? 'Cash' : 'PayOS'} />
          <SummaryRow label="Subtotal" value={formatVnd(totals.subtotalAfterPromo)} />
          {totals.codeDiscount > 0 ? (
            <SummaryRow label="Discount" value={`− ${formatVnd(totals.codeDiscount)}`} tone="text-[var(--admin-success)]" />
          ) : null}
          {totals.pointsDiscount > 0 ? (
            <SummaryRow label={`${totals.pointsUsed} redeemed points`} value={`− ${formatVnd(totals.pointsDiscount)}`} tone="text-[var(--admin-success)]" />
          ) : null}
          <SummaryRow label="Total due" value={formatVnd(totals.total)} strong />
          {isCash ? (
            <>
              <SummaryRow label="Cash received" value={formatVnd(review.receivedAmount)} />
              <SummaryRow label="Change to return" value={formatVnd(review.change)} tone="font-bold text-[var(--admin-success)]" />
            </>
          ) : null}
        </section>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-[var(--admin-danger-bg)] px-4 py-3 text-sm text-[var(--admin-danger)]">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb] disabled:opacity-45"
        >
          No, go back
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="rounded-xl bg-[var(--admin-brand)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? 'Processing...' : 'Yes, pay'}
        </button>
      </div>
    </Modal>
  );
}
