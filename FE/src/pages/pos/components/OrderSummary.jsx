import { formatVnd } from '../../../lib/money.js';

function Row({ label, value, discount = false, strong = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        strong ? 'text-base font-bold text-[var(--admin-text)]' : 'text-sm text-[var(--admin-muted)]'
      }`}
    >
      <span>{label}</span>
      <span className={discount ? 'font-semibold text-[var(--admin-success)]' : ''}>{value}</span>
    </div>
  );
}

export default function OrderSummary({ totals, appliedCode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--admin-border)] bg-[#f7f9fb] px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
          Order summary
        </h2>
      </div>
      <div className="space-y-3 px-4 py-4">
        <Row label="Subtotal" value={formatVnd(totals.subtotalAfterPromo)} />
        {totals.codeDiscount > 0 && (
          <Row
            label={`Campaign code${appliedCode ? ` · ${appliedCode}` : ''}`}
            value={`− ${formatVnd(totals.codeDiscount)}`}
            discount
          />
        )}
        {totals.pointsDiscount > 0 && (
          <Row
            label={`Redeemed points · ${totals.pointsUsed}`}
            value={`− ${formatVnd(totals.pointsDiscount)}`}
            discount
          />
        )}
        <div className="border-t border-[var(--admin-border)] pt-3">
          <Row label="Total amount due" value={formatVnd(totals.total)} strong />
        </div>
      </div>
    </section>
  );
}
