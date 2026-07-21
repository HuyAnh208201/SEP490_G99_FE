import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { formatVnd } from '../../lib/money.js';
import { usePosCart } from '../../contexts/PosCartContext.jsx';
import { MOCK_PRODUCTS, unitPrice } from './data/mockData.js';
import PosPageTitle from './components/PosPageTitle.jsx';

function formatWhen(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export default function OrderHistoryPage() {
  const { orderHistory } = usePosCart();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('ALL');
  const [selectedId, setSelectedId] = useState(orderHistory[0]?.id ?? null);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orderHistory.filter((order) => {
      const matchesSearch =
        !term ||
        order.invoiceCode.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term);
      const matchesMethod = method === 'ALL' || order.paymentMethod === method;
      return matchesSearch && matchesMethod;
    });
  }, [orderHistory, query, method]);

  const selected =
    orderHistory.find((order) => order.id === selectedId) ??
    filteredOrders[0] ??
    null;

  const detailLines =
    selected?.lines ??
    MOCK_PRODUCTS.slice(0, 2).map((product) => ({
      key: String(product.id),
      name: product.name,
      unit: product.unit,
      qty: product.id === 1 ? 1 : 3,
      unitPrice: unitPrice(product),
      unitOriginal: product.price,
      hasPromo: Boolean(product.promoPrice),
    }));

  return (
    <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="Order History" />

      {location.state?.completedInvoice && (
        <div className="mb-4 rounded-xl border border-[var(--admin-success)]/20 bg-[#0d7a3e]/5 px-4 py-3 text-sm text-[var(--admin-success)]">
          <span className="font-semibold">{location.state.completedInvoice}</span> completed successfully.
          {location.state.change != null && ` Change returned: ${formatVnd(location.state.change)}.`}
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
                  <td className="px-4 py-3">{order.customerName}</td>
                  <td className="px-4 py-3">{order.itemCount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#0058be]/10 px-2 py-0.5 text-xs font-semibold text-[var(--admin-brand)]">
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatVnd(order.total)}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--admin-subtle)]">
                    No matching orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          <div className="flex items-center justify-between border-t border-[var(--admin-border)] px-4 py-3 text-xs text-[var(--admin-subtle)]">
            <span>1–{filteredOrders.length} of {orderHistory.length}</span>
            <div className="flex gap-1">
              <button type="button" disabled className="h-8 w-8 rounded-lg border border-[var(--admin-border)] disabled:opacity-40">‹</button>
              <button type="button" className="h-8 w-8 rounded-lg bg-[var(--admin-brand)] font-semibold text-white">1</button>
              <button type="button" disabled className="h-8 w-8 rounded-lg border border-[var(--admin-border)] disabled:opacity-40">›</button>
            </div>
          </div>
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
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Cashier</dt><dd>Current Cashier</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Customer</dt><dd>{selected.customerName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--admin-subtle)]">Payment Method</dt><dd>{selected.paymentMethod}</dd></div>
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
                <div className="mt-4 flex items-center justify-between border-t border-[var(--admin-border)] pt-3">
                  <span className="font-semibold">Total Amount Due</span>
                  <span className="text-lg font-bold text-[var(--admin-brand)]">{formatVnd(selected.total)}</span>
                </div>
              </section>

              <button
                type="button"
                className="w-full rounded-lg border border-[var(--admin-brand)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
              >
                Reprint Receipt
              </button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
