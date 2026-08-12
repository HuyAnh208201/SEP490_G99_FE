import { useState } from 'react';
import { formatVnd } from '../../../lib/money.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import PosProductImage from './PosProductImage.jsx';
import RedeemVoucherBox from './RedeemVoucherBox.jsx';
import { categoryAccent } from '../categoryAccent.js';

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c1.4-3.2 3.6-4.8 6.5-4.8s5.1 1.6 6.5 4.8" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7V5a1 1 0 0 1 1-1h2M4 17v2a1 1 0 0 0 1 1h2M20 7V5a1 1 0 0 0-1-1h-2M20 17v2a1 1 0 0 1-1 1h-2M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

export default function PosCartPanel({
  lines,
  totals,
  customer,
  appliedVoucher,
  discountCodeInput,
  discountCodeError,
  discountCodeBusy,
  setDiscountCodeInput,
  applyDiscountCode,
  clearDiscountCode,
  availablePromotions = [],
  updateQty,
  removeLine,
  customerPhone = '',
  onCustomerPhoneChange,
  onLookupCustomer,
  onScanCustomer,
  onClearCustomer,
  customerBusy = false,
  customerLookupError = '',
  customerPhoneInputRef,
  pointsToRedeem = 0,
  setPointsToRedeem,
  loyalty,
  onClearCart,
  onCheckout,
  selectedKey: selectedKeyProp,
  onSelectLine,
  /** Payment / review: same cart look, no qty/edit/checkout controls. */
  readOnly = false,
  className = '',
}) {
  const [removeTarget, setRemoveTarget] = useState(null);
  const [selectedKeyInternal, setSelectedKeyInternal] = useState(null);
  const [draftQty, setDraftQty] = useState({});
  const selectedKey = selectedKeyProp !== undefined ? selectedKeyProp : selectedKeyInternal;

  function selectLine(key) {
    if (onSelectLine) onSelectLine(key);
    else setSelectedKeyInternal(key);
  }

  function changeQuantity(line, nextQuantity) {
    if (nextQuantity <= 0) {
      setRemoveTarget(line);
      return;
    }
    updateQty(line.key, nextQuantity);
    setDraftQty((prev) => {
      const next = { ...prev };
      delete next[line.key];
      return next;
    });
  }

  function commitTypedQty(line) {
    const raw = draftQty[line.key];
    if (raw === undefined) return;
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRemoveTarget(line);
      return;
    }
    const capped =
      line.stock > 0 ? Math.min(parsed, line.stock, 10000) : Math.min(parsed, 10000);
    changeQuantity(line, capped);
  }

  const maxRedeemable =
    customer && loyalty?.pointValueVnd > 0
      ? Math.min(
          customer.points,
          Math.floor(
            Math.max(0, totals.subtotalAfterPromo - totals.codeDiscount) / loyalty.pointValueVnd,
          ),
        )
      : 0;

  /** Campaign id → the amount it actually took off, so the list shows money, not a rate. */
  const appliedAmountById = new Map(
    (totals.campaignLines ?? []).map((line) => [line.id, line.amount]),
  );

  return (
    <aside
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)] ${
        readOnly ? 'h-full' : 'xl:sticky xl:top-3 xl:h-[calc(100vh-80px)]'
      } ${className}`}
    >
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--admin-text)]">Current order</h2>
            <p className="text-xs text-[var(--admin-subtle)]">
              {readOnly ? 'Ready for payment' : 'Draft'} · {totals.itemCount} items
            </p>
          </div>
        </div>

        {readOnly ? (
          <div className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2.5">
            {customer ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{customer.fullName}</p>
                <p className="mt-0.5 text-xs tabular-nums text-[var(--admin-muted)]">{customer.phone}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {customer.tierName || customer.tierCode ? (
                    <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--admin-brand)]">
                      {customer.tierName || customer.tierCode}
                    </span>
                  ) : null}
                  <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--admin-text)]">
                    {customer.points} pts
                  </span>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--admin-muted)]">
                <PersonIcon />
                Walk-in
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
              Customer phone number
            </label>
            <div className="flex gap-2">
              <input
                ref={customerPhoneInputRef}
                value={customerPhone}
                onChange={(event) => onCustomerPhoneChange?.(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onLookupCustomer?.(customerPhone);
                  }
                }}
                onBlur={() => {
                  if (customerPhone.trim() && !customer) {
                    onLookupCustomer?.(customerPhone);
                  }
                }}
                placeholder="0912345678"
                inputMode="tel"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
              />
              <button
                type="button"
                onClick={onScanCustomer}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-brand)] text-white transition hover:bg-[var(--admin-brand-hover)]"
                aria-label="Scan customer QR"
                title="Scan customer QR"
              >
                <ScanIcon />
              </button>
            </div>
            {customerBusy && (
              <p className="text-[11px] font-medium text-[var(--admin-subtle)]">Looking up…</p>
            )}
            {customerLookupError && !customerBusy && (
              <p className="text-xs text-[var(--admin-danger)]">{customerLookupError}</p>
            )}
            {customer ? (
              <div className="rounded-xl border border-[#0058be]/20 bg-[#0058be]/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{customer.fullName}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {customer.tierName || customer.tierCode ? (
                        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--admin-brand)]">
                          {customer.tierName || customer.tierCode}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--admin-text)]">
                        {customer.points} pts
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearCustomer}
                    className="shrink-0 text-xs font-semibold text-[var(--admin-danger)] hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {customer.points > 0 && setPointsToRedeem && loyalty && (
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
                )}
                {(totals.pointsUsed > 0 || totals.pointsEarned > 0) && (
                  <p className="mt-2 text-[11px] font-medium text-[var(--admin-success)]">
                    {totals.pointsUsed > 0 ? `${totals.pointsUsed} pts redeemed. ` : ''}
                    {totals.pointsEarned > 0 ? `Earn ~${totals.pointsEarned} pts.` : ''}
                  </p>
                )}
                {/* VOUCHER UI HIDDEN (1 of 2) — exchange points for a voucher code.
                    Hidden together with the code input further down. Restoring only this
                    half lets a customer spend points for real (deductPointsAtomic) and
                    receive a code with nowhere to use it. Uncomment both to restore.

                {!readOnly && (
                  <RedeemVoucherBox
                    customer={customer}
                    onRedeemed={() => onLookupCustomer?.(customer.phone)}
                  />
                )}
                */}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Deliberately low floor: this list scrolls but the button row below does not, and
          the panel is overflow-hidden — a taller floor clips the buttons on short screens.
          Tall screens are unaffected because flex-1 still takes all the free space. */}
      <div className="min-h-[120px] flex-1 overflow-y-auto">
        {lines.length ? (
          <ul className="divide-y divide-[var(--admin-border)]">
            {lines.map((line) => {
              const selected = !readOnly && selectedKey === line.key;
              const qtyValue =
                draftQty[line.key] !== undefined ? draftQty[line.key] : String(line.qty);
              return (
                <li
                  key={line.key}
                  role={readOnly ? undefined : 'button'}
                  tabIndex={readOnly ? undefined : 0}
                  onClick={readOnly ? undefined : () => selectLine(line.key)}
                  onKeyDown={
                    readOnly
                      ? undefined
                      : (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            selectLine(line.key);
                          }
                        }
                  }
                  className={`flex gap-3 px-4 py-3 outline-none transition ${
                    selected
                      ? 'bg-[#0058be]/5 ring-2 ring-inset ring-[var(--admin-brand)]'
                      : readOnly
                        ? 'bg-white'
                        : 'hover:bg-[#f7f9fb]'
                  }`}
                >
                  <PosProductImage
                    src={line.imageUrl}
                    name={line.name}
                    accent={categoryAccent(line.category)}
                    className="h-14 w-14 shrink-0 rounded-xl border border-[var(--admin-border)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-[var(--admin-text)]">{line.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--admin-subtle)]">
                          {formatVnd(line.unitPrice)} / {line.unit || 'item'}
                        </p>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRemoveTarget(line);
                          }}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--admin-danger)] transition hover:bg-[var(--admin-danger-bg)]"
                          aria-label={`Remove ${line.name}`}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      {readOnly ? (
                        <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb]">
                          <span className="flex h-full w-9 items-center justify-center text-lg text-[var(--admin-subtle)]">
                            −
                          </span>
                          <span className="flex h-full w-12 items-center justify-center border-x border-[var(--admin-border)] bg-white text-sm font-bold">
                            {line.qty}
                          </span>
                          <span className="flex h-full w-9 items-center justify-center text-lg text-[var(--admin-subtle)]">
                            +
                          </span>
                        </div>
                      ) : (
                        <div
                          className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-[var(--admin-border)] bg-white"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => changeQuantity(line, line.qty - 1)}
                            className="h-full w-9 text-lg text-[var(--admin-muted)] transition hover:bg-[#f0f4f8]"
                            aria-label={`Decrease ${line.name}`}
                          >
                            −
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={qtyValue}
                            onChange={(event) => {
                              const next = event.target.value.replace(/[^\d]/g, '');
                              setDraftQty((prev) => ({ ...prev, [line.key]: next }));
                            }}
                            onBlur={() => commitTypedQty(line)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.currentTarget.blur();
                              }
                            }}
                            className="h-full w-12 border-x border-[var(--admin-border)] bg-white text-center text-sm font-bold outline-none"
                            aria-label={`Quantity for ${line.name}`}
                          />
                          <button
                            type="button"
                            onClick={() => changeQuantity(line, line.qty + 1)}
                            disabled={line.stock > 0 && line.qty >= line.stock}
                            className="h-full w-9 text-lg text-[var(--admin-brand)] transition hover:bg-[#f0f4f8] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Increase ${line.name}`}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <p className="text-sm font-bold text-[var(--admin-brand)]">
                        {formatVnd(line.unitPrice * line.qty)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center text-[var(--admin-subtle)]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0058be]/5 text-[var(--admin-brand)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 9.5 5 4h14l2 5.5M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5ZM9 14h6" />
              </svg>
            </div>
            <p className="font-semibold text-[var(--admin-text)]">Your cart is empty</p>
          </div>
        )}
      </div>

      {/* This block must be free to shrink: the aside clips its overflow, so a fixed
          height here cuts off the checkout button on short screens. The middle scrolls
          and the button row stays pinned to the bottom. */}
      <div className="flex min-h-0 flex-col gap-3 border-t border-[var(--admin-border)] bg-[#fbfcfe] p-4">
        {/* Store campaigns applied to this order. Read-only: the counter cannot pick or
            drop any of them. Hidden when the branch has none running.

            The aside is overflow-hidden at a fixed calc(100vh-80px), so anything that
            pushes the Checkout button down is CLIPPED rather than scrolled to. The list
            therefore floats above the control (absolute + bottom-full): open or closed,
            this row takes exactly the same height. */}
        {!readOnly && availablePromotions.length > 0 && (
          <details className="group relative rounded-lg border border-[var(--admin-border)] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold">
              <span>
                Promotions
                {totals.campaignLines?.length > 0 && (
                  <span className="ml-1.5 font-bold text-[var(--admin-success)]">
                    · {totals.campaignLines.length} applied
                  </span>
                )}
              </span>
              <span className="text-[11px] font-normal text-[var(--admin-subtle)] group-open:hidden">Show</span>
              <span className="hidden text-[11px] font-normal text-[var(--admin-subtle)] group-open:inline">Hide</span>
            </summary>
            <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-white p-2 shadow-[var(--shadow-card)]">
              {availablePromotions.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{campaign.name}</span>
                  {/* With items in the cart, show the money taken off; empty cart shows
                      the rate. The totals table carries a single merged line, so this is
                      the only place a per-campaign contribution is visible. */}
                  {appliedAmountById.has(campaign.id) ? (
                    <span className="shrink-0 font-semibold text-[var(--admin-success)]">
                      − {formatVnd(appliedAmountById.get(campaign.id))}
                    </span>
                  ) : (
                    <span className="shrink-0 font-semibold text-[var(--admin-brand)]">
                      {campaign.type === 'PERCENT'
                        ? `− ${Number(campaign.discountValue)}%`
                        : `− ${formatVnd(campaign.discountValue)}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* The campaigns control sits OUTSIDE this scroll area: its list floats with
            absolute positioning and would be clipped inside overflow-y-auto. */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {/* VOUCHER UI HIDDEN (2 of 2) — the customer code input and the applied line.
              UI only: applyDiscountCode, lookupVoucher and the server voucherCode path
              are all intact. This screen belongs to UC-101 (Giang) — uncomment both
              blocks to bring it back exactly as it was.

          {!readOnly && (
            <>
              <div className="flex gap-2">
                <input
                  value={discountCodeInput}
                  onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
                  placeholder="Discount code"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs uppercase outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                {appliedVoucher ? (
                  <button type="button" onClick={clearDiscountCode} className="rounded-lg border border-[var(--admin-danger)]/30 px-3 text-xs font-semibold text-[var(--admin-danger)] transition hover:bg-[var(--admin-danger-bg)]">
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={discountCodeBusy || !discountCodeInput.trim()}
                    onClick={applyDiscountCode}
                    className="rounded-lg border border-[var(--admin-brand)] px-3 text-xs font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/8 disabled:opacity-40"
                  >
                    Apply
                  </button>
                )}
              </div>
              {discountCodeError && <p className="text-xs text-[var(--admin-danger)]">{discountCodeError}</p>}
            </>
          )}
          {appliedVoucher && (
            <p className="text-xs font-medium text-[var(--admin-success)]">
              {appliedVoucher.code} applied · {appliedVoucher.name}
            </p>
          )}
          */}

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[var(--admin-muted)]">
              <span>Subtotal</span>
              <span>{formatVnd(totals.subtotalAfterPromo)}</span>
            </div>
            {/* One merged line on purpose: listing every campaign makes the totals table
                scroll inside a narrow box and become hard to read. The per-campaign
                amounts live in the Promotions control above. */}
            {totals.campaignDiscount > 0 && (
              <div className="flex justify-between text-[var(--admin-success)]">
                <span>Promotions · {totals.campaignLines.length}</span>
                <span>− {formatVnd(totals.campaignDiscount)}</span>
              </div>
            )}
            {totals.codeDiscount > 0 && (
              <div className="flex justify-between text-[var(--admin-success)]">
                <span>Discount</span>
                <span>− {formatVnd(totals.codeDiscount)}</span>
              </div>
            )}
            {totals.pointsDiscount > 0 && (
              <div className="flex justify-between text-[var(--admin-success)]">
                <span>{totals.pointsUsed} redeemed points</span>
                <span>− {formatVnd(totals.pointsDiscount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* The total sits OUTSIDE the scroll area, next to the button row: on short
            screens the breakdown lines may scroll out of sight, but the amount the
            customer owes must not. */}
        <div className="flex shrink-0 items-end justify-between border-t border-[var(--admin-border)] pt-2 text-sm">
          <span className="font-semibold">Total amount due</span>
          <span className="text-2xl font-extrabold tracking-tight text-[var(--admin-brand)]">
            {formatVnd(totals.total)}
          </span>
        </div>

        {!readOnly && (
          <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              disabled={!lines.length}
              onClick={onClearCart}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--admin-danger)]/25 bg-white px-3 text-xs font-semibold text-[var(--admin-danger)] transition hover:bg-[var(--admin-danger-bg)] disabled:opacity-35"
            >
              <TrashIcon />
              Cancel order
            </button>
            <button
              type="button"
              disabled={!lines.length}
              onClick={onCheckout}
              className="flex min-h-12 items-center justify-between rounded-xl bg-[var(--admin-brand)] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Checkout</span>
              <span className="flex items-center gap-2">
                <kbd className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">F4</kbd>
                <span>{formatVnd(totals.total)}</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {!readOnly && (
        <ConfirmDialog
          open={Boolean(removeTarget)}
          onClose={() => setRemoveTarget(null)}
          title="Remove product"
          message={removeTarget ? `Remove "${removeTarget.name}" from the cart?` : ''}
          confirmLabel="Remove"
          danger
          onConfirm={() => {
            if (removeTarget) removeLine(removeTarget.key);
            setRemoveTarget(null);
          }}
        />
      )}
    </aside>
  );
}
