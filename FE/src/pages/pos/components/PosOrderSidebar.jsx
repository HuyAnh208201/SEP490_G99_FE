import { useEffect, useState } from 'react';
import { formatVnd } from '../../../lib/money.js';
import { fetchApplicablePromotions } from '../../../api/posOrders.js';
import PosCheckoutPanel from './PosCheckoutPanel.jsx';

export default function PosOrderSidebar({
  lines,
  totals,
  customer,
  customerPhone,
  onCustomerPhoneChange,
  onLookupCustomer,
  onScanCustomer,
  onClearCustomer,
  customerBusy,
  customerLookupError,
  customerPhoneInputRef,
  pointsToRedeem,
  setPointsToRedeem,
  loyalty,
  campaignId,
  onApplyCampaign,
  onClearCampaign,
  onClearCart,
  paymentOpen,
  onPaymentOpenChange,
  paymentMethod,
  reviewOpen,
  onRequestReview,
}) {
  const [expanded, setExpanded] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [promoError, setPromoError] = useState('');
  const maxRedeemable =
    customer && loyalty?.pointValueVnd > 0
      ? Math.min(
          customer.points,
          Math.floor(
            Math.max(0, totals.subtotalAfterPromo - totals.codeDiscount) / loyalty.pointValueVnd,
          ),
        )
      : 0;

  useEffect(() => {
    if (paymentOpen) setExpanded(true);
  }, [paymentOpen]);

  useEffect(() => {
    let cancelled = false;
    const subtotal = totals.subtotalAfterPromo;
    if (!lines.length) {
      setPromotions([]);
      setPromoError('');
      return undefined;
    }
    (async () => {
      try {
        const list = await fetchApplicablePromotions(subtotal);
        if (cancelled) return;
        const filtered = (list ?? []).filter((p) => String(p.type || '').toUpperCase() !== 'BUY_X_GET_Y');
        setPromotions(filtered);
        setPromoError('');
        if (campaignId) {
          const selected = filtered.find((p) => Number(p.id) === Number(campaignId));
          if (!selected?.eligible) {
            onClearCampaign?.();
          } else if (Number(selected.discountAmount) !== Number(totals.codeDiscount)) {
            onApplyCampaign?.(selected);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setPromotions([]);
          setPromoError(error?.message || 'Could not load promotions.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lines.length, totals.subtotalAfterPromo, campaignId]);

  return (
    <details
      id="pos-order-sidebar"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="group min-w-0 xl:contents"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-3 text-sm font-semibold shadow-[var(--shadow-card)] xl:hidden">
        <span className="min-w-0 truncate">Order details · {totals.itemCount} items · {formatVnd(totals.total)}</span>
        <span className="text-xs text-[var(--admin-subtle)] group-open:hidden">Show</span>
        <span className="hidden text-xs text-[var(--admin-subtle)] group-open:inline">Hide</span>
      </summary>

      <div className="hidden min-h-0 group-open:block xl:block">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)] xl:h-full">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <section>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[var(--admin-text)]">Order details</h2>
                  <p className="text-xs text-[var(--admin-subtle)]">Draft · {totals.itemCount} items</p>
                </div>
              </div>

              <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
                Customer phone number
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  ref={customerPhoneInputRef}
                  value={customerPhone}
                  onChange={(event) => onCustomerPhoneChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onLookupCustomer(customerPhone);
                    }
                  }}
                  onBlur={() => {
                    if (customerPhone.trim() && !customer) onLookupCustomer(customerPhone);
                  }}
                  placeholder="0912345678"
                  inputMode="tel"
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                <button
                  type="button"
                  onClick={onScanCustomer}
                  aria-label="Scan customer QR"
                  title="Scan customer QR"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-brand)] text-white transition hover:bg-[var(--admin-brand-hover)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M7 12h10" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {customerBusy ? <p className="mt-1 text-[11px] text-[var(--admin-subtle)]">Looking up...</p> : null}
              {customerLookupError && !customerBusy ? (
                <p className="mt-1 text-xs text-[var(--admin-danger)]">{customerLookupError}</p>
              ) : null}

              {customer ? (
                <div className="mt-2 rounded-xl border border-[#0058be]/20 bg-[#0058be]/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{customer.fullName}</p>
                      <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                        {customer.tierName || customer.tierCode || 'Member'} · {customer.points} pts
                      </p>
                    </div>
                    <button type="button" onClick={onClearCustomer} className="text-xs font-semibold text-[var(--admin-danger)] hover:underline">
                      Clear
                    </button>
                  </div>
                  {customer.points > 0 && loyalty ? (
                    <label className="mt-3 block text-[11px] font-semibold text-[var(--admin-muted)]">
                      Redeem points · 1 pt = {formatVnd(loyalty.pointValueVnd)}
                      <input
                        type="number"
                        min="0"
                        max={maxRedeemable}
                        step="1"
                        value={pointsToRedeem}
                        onChange={(event) => {
                          const raw = Math.floor(Number(event.target.value) || 0);
                          setPointsToRedeem(Math.max(0, Math.min(maxRedeemable, raw)));
                        }}
                        className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
                Promotion
              </label>
              <select
                value={campaignId ?? ''}
                disabled={!lines.length}
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) {
                    onClearCampaign?.();
                    return;
                  }
                  const promo = promotions.find((p) => String(p.id) === id);
                  if (promo?.eligible) onApplyCampaign?.(promo);
                }}
                className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-brand)] disabled:opacity-50"
              >
                <option value="">None</option>
                {promotions.map((promo) => (
                  <option
                    key={promo.id}
                    value={promo.id}
                    disabled={!promo.eligible}
                    title={promo.reason || undefined}
                  >
                    {promo.name}
                    {!promo.eligible && promo.reason ? ` — ${promo.reason}` : ''}
                    {promo.eligible && promo.discountAmount != null
                      ? ` (−${formatVnd(promo.discountAmount)})`
                      : ''}
                  </option>
                ))}
              </select>
              {promoError ? (
                <p className="mt-1 text-xs text-[var(--admin-danger)]">{promoError}</p>
              ) : null}
            </section>
          </div>

          <div className="shrink-0 space-y-3 border-t border-[var(--admin-border)] bg-[#fbfcfe] p-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--admin-muted)]">
                <span>Subtotal</span>
                <span>{formatVnd(totals.subtotalAfterPromo)}</span>
              </div>
              {totals.codeDiscount > 0 ? (
                <div className="flex justify-between text-[var(--admin-success)]">
                  <span>{totals.campaignName || 'Promotion'}</span>
                  <span>− {formatVnd(totals.codeDiscount)}</span>
                </div>
              ) : null}
              {totals.pointsDiscount > 0 ? (
                <div className="flex justify-between text-[var(--admin-success)]">
                  <span>{totals.pointsUsed} redeemed points</span><span>− {formatVnd(totals.pointsDiscount)}</span>
                </div>
              ) : null}
              <div className="flex items-end justify-between border-t border-[var(--admin-border)] pt-2">
                <span className="font-semibold">Total due</span>
                <span className="shrink-0 whitespace-nowrap text-2xl font-extrabold tracking-tight text-[var(--admin-brand)]">{formatVnd(totals.total)}</span>
              </div>
              {customer && totals.pointsEarned > 0 ? (
                <p className="text-[11px] text-[var(--admin-subtle)]">
                  Earns ~{totals.pointsEarned} pts (on amount after promo)
                </p>
              ) : null}
            </div>

            <PosCheckoutPanel
              open={paymentOpen}
              onOpenChange={onPaymentOpenChange}
              lines={lines}
              totals={totals}
              initialMethod={paymentMethod}
              reviewOpen={reviewOpen}
              onRequestReview={onRequestReview}
            />

            <button
              type="button"
              disabled={!lines.length || paymentOpen}
              onClick={onClearCart}
              className="min-h-10 w-full rounded-xl border border-[var(--admin-danger)]/25 bg-white px-3 text-xs font-semibold text-[var(--admin-danger)] transition hover:bg-[var(--admin-danger-bg)] disabled:opacity-35"
            >
              Cancel order
            </button>
          </div>
        </aside>
      </div>
    </details>
  );
}
