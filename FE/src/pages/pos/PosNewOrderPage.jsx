import { useMemo, useState } from 'react';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import {
  MOCK_DISCOUNT_CODES,
  MOCK_PRODUCTS,
  POINT_VALUE_VND,
} from './data/mockData.js';
import CheckoutDialog from './components/CheckoutDialog.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import OrderSummary from './components/OrderSummary.jsx';
import PosOrderTable from './components/PosOrderTable.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';
import ProductQtyPopup from './components/ProductQtyPopup.jsx';

export default function PosNewOrderPage() {
  const {
    lines,
    customer,
    customerLookupError,
    discountCodeInput,
    setDiscountCodeInput,
    appliedCode,
    discountCodeError,
    pointsToRedeem,
    setPointsToRedeem,
    totals,
    addProduct,
    updateQty,
    removeLine,
    clearCart,
    lookupCustomer,
    applyDiscountCode,
    clearDiscountCode,
    paymentOpen,
    setPaymentOpen,
  } = usePosCart();

  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [popupProduct, setPopupProduct] = useState(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [pendingQty, setPendingQty] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  const searchTerm = pendingProduct ? '' : query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!searchTerm || pendingProduct) return [];
    return MOCK_PRODUCTS.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.code.toLowerCase().includes(searchTerm) ||
        product.barcode.includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm),
    ).slice(0, 8);
  }, [searchTerm, pendingProduct]);

  function openProductPopup(product) {
    setPopupProduct(product);
    setShowResults(false);
  }

  function confirmPendingProduct(product, qty) {
    setPendingProduct(product);
    setPendingQty(qty);
    setQuery(`${product.name} × ${qty}`);
    setPopupProduct(null);
    setShowResults(false);
  }

  function clearPending() {
    setPendingProduct(null);
    setPendingQty(1);
    setQuery('');
  }

  function commitPendingToCart() {
    if (pendingProduct) {
      addProduct(pendingProduct, pendingQty);
      clearPending();
      return;
    }

    const exact = MOCK_PRODUCTS.find(
      (product) =>
        product.barcode === query.trim() ||
        product.code.toLowerCase() === query.trim().toLowerCase(),
    );
    if (exact) {
      openProductPopup(exact);
      return;
    }
    setShowResults(true);
  }

  function handleProductSearch(event) {
    event.preventDefault();
    commitPendingToCart();
  }

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
        <PosPageTitle title="Product Cart" />

        <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--admin-border)] px-4 py-4">
                <form onSubmit={handleProductSearch} className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle)]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16.5 16.5 4 4" strokeLinecap="round" />
                  </svg>
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (pendingProduct) {
                        clearPending();
                      }
                      setQuery(value);
                      setShowResults(true);
                    }}
                    onFocus={() => {
                      if (!pendingProduct) setShowResults(true);
                    }}
                    placeholder="Scan barcode or search products to add to cart..."
                    className="w-full rounded-lg border border-[var(--admin-border)] bg-white py-2.5 pl-10 pr-24 text-sm outline-none transition placeholder:text-[var(--admin-subtle)] focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-[var(--admin-brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--admin-brand-hover)]"
                  >
                    Add item
                  </button>
                  {showResults && !pendingProduct && query && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-elevated)]">
                      {results.length ? (
                        results.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => openProductPopup(product)}
                            className="flex w-full items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3 text-left last:border-0 hover:bg-[#f7f9fb]"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{product.name}</span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--admin-subtle)]">
                                <span className="rounded border border-[var(--admin-border)] bg-[#f7f9fb] px-1.5 py-0.5 font-semibold text-[var(--admin-muted)]">
                                  {product.category}
                                </span>
                                <span>{product.code}</span>
                                <span>· Stock {product.stock}</span>
                              </span>
                            </span>
                            <span className="shrink-0 text-right">
                              {product.promoPrice != null && (
                                <span className="block text-[11px] text-[var(--admin-subtle)] line-through">
                                  {formatVnd(product.price)}
                                </span>
                              )}
                              <span className="text-sm font-semibold text-[var(--admin-brand)]">
                                {formatVnd(product.promoPrice ?? product.price)}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-[var(--admin-subtle)]">No product found.</p>
                      )}
                    </div>
                  )}
                </form>
                {pendingProduct && (
                  <p className="mt-2 text-xs text-[var(--admin-muted)]">
                    Ready to add: <span className="font-semibold text-[var(--admin-text)]">{pendingProduct.name}</span>
                    {' · '}Quantity {pendingQty}. Press <strong>Add item</strong> or Enter.
                  </p>
                )}
              </div>

              <PosOrderTable
                lines={lines}
                editable
                updateQty={updateQty}
                removeLine={removeLine}
              />

              <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={!lines.length}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-muted)] transition hover:bg-[#f7f9fb] disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" strokeLinecap="round" />
                  </svg>
                  Clear Entire Cart
                </button>
                <span className="text-xs text-[var(--admin-subtle)]">
                  {totals.itemCount} items in cart
                </span>
              </div>
            </section>

            <OrderSummary totals={totals} appliedCode={appliedCode} />
          </div>

          <aside className="space-y-4 2xl:sticky 2xl:top-0">
            <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                Campaign discount code
              </h2>
              <input
                value={discountCodeInput}
                onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
                placeholder="Enter a discount code"
                className="mt-3 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm uppercase outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
              />
              {appliedCode ? (
                <div className="mt-2 rounded-lg border border-[var(--admin-success)]/20 bg-[#0d7a3e]/5 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--admin-success)]">Code applied</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {MOCK_DISCOUNT_CODES[appliedCode]?.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearDiscountCode}
                      className="text-xs font-semibold text-[var(--admin-brand)] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  className="mt-2 w-full rounded-lg bg-[var(--admin-brand)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)]"
                >
                  Apply Discount Code
                </button>
              )}
              {discountCodeError && (
                <p className="mt-2 text-xs text-[var(--admin-danger)]">{discountCodeError}</p>
              )}
            </section>

            <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-card)]">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                Customer
              </h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter phone number"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
                />
                <button
                  type="button"
                  onClick={() => lookupCustomer(phone)}
                  className="rounded-lg border border-[var(--admin-brand)] px-3 py-2.5 text-xs font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
                >
                  Look Up
                </button>
                <button
                  type="button"
                  title="Scan customer QR"
                  className="flex w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-muted)] transition hover:bg-[#f7f9fb]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-6v-2M14 18h2" />
                  </svg>
                </button>
              </div>
              {customerLookupError && (
                <p className="mt-2 text-xs text-[var(--admin-danger)]">{customerLookupError}</p>
              )}
              {customer ? (
                <div className="mt-3 rounded-lg border border-[#0058be]/15 bg-[#0058be]/5 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{customer.fullName}</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {customer.memberCode} · {customer.tier}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[var(--admin-brand)]">
                      {customer.points} pts
                    </span>
                  </div>
                  <label className="mt-3 block text-[11px] font-bold uppercase tracking-wide text-[var(--admin-subtle)]">
                    Redeem points · 1 point = {formatVnd(POINT_VALUE_VND)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={customer.points}
                    value={pointsToRedeem}
                    onChange={(event) =>
                      setPointsToRedeem(
                        Math.max(0, Math.min(customer.points, Number(event.target.value) || 0)),
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-brand)]"
                  />
                  {totals.pointsEarned > 0 && (
                    <p className="mt-2 text-xs font-medium text-[var(--admin-success)]">
                      Customer will earn +{totals.pointsEarned} points.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--admin-subtle)]">Retail customer · no points</p>
              )}
            </section>

            <button
              type="button"
              disabled={!lines.length}
              onClick={() => setPaymentOpen(true)}
              className="flex w-full items-center justify-between rounded-lg bg-[var(--admin-brand)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--admin-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>Proceed to Payment</span>
              <span>{formatVnd(totals.total)}</span>
            </button>
          </aside>
        </div>
      </main>

      <ProductQtyPopup
        open={Boolean(popupProduct)}
        product={popupProduct}
        onClose={() => setPopupProduct(null)}
        onConfirm={confirmPendingProduct}
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear entire cart"
        message="Remove all products from the cart? This cannot be undone."
        confirmLabel="Clear cart"
        danger
        onConfirm={clearCart}
      />

      <CheckoutDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} />
    </>
  );
}
