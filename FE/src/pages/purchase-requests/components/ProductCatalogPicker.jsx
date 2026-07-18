import { useMemo, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import { unitLabel } from '../../../constants/productUnits.js';
import AddQtyModal from './AddQtyModal.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

/**
 * Full branch product catalog with In Stock + multi-select.
 * Parent owns selection lines; this only picks products to add.
 */
export default function ProductCatalogPicker({
  products = [],
  excludedIds,
  loading = false,
  onAddMany,
}) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [pendingProduct, setPendingProduct] = useState(null);

  const excluded = useMemo(
    () => (excludedIds instanceof Set ? excludedIds : new Set(excludedIds || [])),
    [excludedIds],
  );

  const available = useMemo(
    () => products.filter((p) => !excluded.has(p.id)),
    [products, excluded],
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return available;
    return available.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q),
    );
  }, [available, filter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function addSelected() {
    const picks = products.filter((p) => selected.has(p.id) && !excluded.has(p.id));
    if (!picks.length) return;
    onAddMany?.(picks);
    setSelected(new Set());
  }

  function addOne(product) {
    setPendingProduct(product);
  }

  function confirmAddOne(qty) {
    if (!pendingProduct) return;
    onAddMany?.([{ ...pendingProduct, requestedQty: qty }]);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(pendingProduct.id);
      return next;
    });
    setPendingProduct(null);
  }

  const selectedCount = [...selected].filter((id) => !excluded.has(id)).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Product catalog
          </span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, SKU, or category…"
            className={inputClass}
          />
        </label>
        <Button
          type="button"
          className="!px-3 !py-2 !text-sm"
          disabled={selectedCount === 0}
          onClick={addSelected}
        >
          Add selected ({selectedCount})
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--admin-border)]">
        <div className="max-h-56 overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    disabled={filtered.length === 0}
                    aria-label="Select all visible products"
                    className="rounded border-[var(--admin-border)] text-[#0058be]"
                  />
                </th>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">In stock</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6">
                    <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-[var(--admin-muted)]"
                  >
                    {available.length === 0
                      ? 'All catalog products are already on this request.'
                      : 'No products match your filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const hasStock = p.currentStock != null && p.currentStock !== '';
                  const stock = hasStock ? Number(p.currentStock) : null;
                  const low =
                    hasStock &&
                    stock <= (p.reorderPoint != null ? Number(p.reorderPoint) : 10);
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                          aria-label={`Select ${p.name}`}
                          className="rounded border-[var(--admin-border)] text-[#0058be]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--admin-text)]">{p.name}</div>
                        <div className="font-mono text-xs text-[var(--admin-subtle)]">
                          {p.code}
                          {p.categoryName ? ` · ${p.categoryName}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[var(--admin-muted)]">{unitLabel(p.unit)}</td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-semibold ${
                          !hasStock
                            ? 'text-[var(--admin-subtle)]'
                            : low
                              ? 'text-red-600'
                              : 'text-[var(--admin-text)]'
                        }`}
                      >
                        {hasStock ? stock : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => addOne(p)}
                          className="text-xs font-semibold text-[#0058be] hover:underline"
                        >
                          + Add
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-[var(--admin-border)] bg-[#f7f9fb]/60 px-3 py-2 text-xs text-[var(--admin-muted)]">
          Showing {filtered.length} of {available.length} available products
        </div>
      </div>

      <AddQtyModal
        open={Boolean(pendingProduct)}
        product={pendingProduct}
        defaultQty={1}
        onConfirm={confirmAddOne}
        onCancel={() => setPendingProduct(null)}
      />
    </div>
  );
}
