import { useMemo, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import { unitLabel } from '../../../constants/productUnits.js';
import { formatVnd } from '../../../lib/money.js';
import AddQtyModal from './AddQtyModal.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function normId(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
}

function resolveSuggestedQty(p) {
  if (p.suggestedQty != null && p.suggestedQty !== '') {
    const n = Number(p.suggestedQty);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const stock = Number(p.currentStock ?? 0);
  const reorder = Number(p.reorderPoint ?? 0);
  const pack = Math.max(1, Number(p.unitsPerImportUnit) || 1);
  if (!(reorder > 0) || stock > reorder) return null;
  return Math.max(1, Math.ceil((reorder - stock) / pack));
}

/**
 * Server-driven product catalog page for purchase requests.
 * Parent owns keyword, filters, and pagination.
 */
export default function ProductCatalogPicker({
  products = [],
  excludedIds,
  loading = false,
  loadError = '',
  onRetry,
  keyword = '',
  onKeywordChange,
  categories = [],
  categoryId = '',
  onCategoryChange,
  stockSort = '',
  onStockSortChange,
  lowStockOnly = false,
  onLowStockOnlyChange,
  addSuggestedCount = 0,
  addSuggestedBusy = false,
  addSuggestedError = '',
  onAddSuggested,
  onRetrySuggested,
  page = 1,
  totalPages = 0,
  totalRecords = 0,
  onPageChange,
  onAddMany,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [pendingProduct, setPendingProduct] = useState(null);

  const excluded = useMemo(() => {
    const source = excludedIds instanceof Set ? [...excludedIds] : excludedIds || [];
    return new Set(source.map(normId));
  }, [excludedIds]);

  const available = useMemo(
    () => products.filter((p) => !excluded.has(normId(p.id))),
    [products, excluded],
  );

  const allAvailableSelected =
    available.length > 0 && available.every((p) => selected.has(normId(p.id)));

  function toggleOne(id) {
    const key = normId(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllAvailable() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allAvailableSelected) {
        available.forEach((p) => next.delete(normId(p.id)));
      } else {
        available.forEach((p) => next.add(normId(p.id)));
      }
      return next;
    });
  }

  function addSelected() {
    const picks = products.filter((p) => selected.has(normId(p.id)) && !excluded.has(normId(p.id)));
    if (!picks.length) return;
    onAddMany?.(
      picks.map((p) => {
        const suggested = resolveSuggestedQty(p);
        return suggested != null ? { ...p, requestedQty: suggested } : p;
      }),
    );
    setSelected(new Set());
  }

  function confirmAddOne(qty) {
    if (!pendingProduct) return;
    onAddMany?.([{ ...pendingProduct, requestedQty: qty }]);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(normId(pendingProduct.id));
      return next;
    });
    setPendingProduct(null);
  }

  const selectedCount = [...selected].filter((id) => !excluded.has(id)).length;

  let emptyMessage = 'No products on this page.';
  if (loadError) {
    emptyMessage = loadError;
  } else if (keyword.trim() || categoryId || lowStockOnly) {
    emptyMessage = 'No products match your filters.';
  } else if (products.length === 0) {
    emptyMessage = 'No catalog products available.';
  } else if (available.length === 0) {
    emptyMessage = 'All products on this page are already on this request.';
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[10rem] flex-1 space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Search
          </span>
          <input
            value={keyword}
            onChange={(e) => onKeywordChange?.(e.target.value)}
            placeholder="Name, SKU, barcode…"
            className={inputClass}
          />
        </label>
        <label className="w-[10.5rem] space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Category
          </span>
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            className={inputClass}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="w-[11rem] space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Stock sort
          </span>
          <select
            value={stockSort}
            onChange={(e) => onStockSortChange?.(e.target.value)}
            className={inputClass}
          >
            <option value="asc">Stock: low to high</option>
            <option value="desc">Stock: high to low</option>
          </select>
        </label>
        <label className="flex h-[38px] items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm text-[var(--admin-text)]">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => onLowStockOnlyChange?.(e.target.checked)}
            className="rounded border-[var(--admin-border)] text-[#0058be]"
          />
          Low stock only
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-2 !text-sm"
          disabled={selectedCount === 0}
          onClick={addSelected}
        >
          Add selected ({selectedCount})
        </Button>
        <Button
          type="button"
          className="!px-3 !py-2 !text-sm"
          disabled={addSuggestedBusy || addSuggestedCount <= 0}
          onClick={onAddSuggested}
        >
          Add suggested ({addSuggestedCount})
        </Button>
      </div>

      {addSuggestedError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {addSuggestedError}
          {onRetrySuggested ? (
            <button
              type="button"
              onClick={onRetrySuggested}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {loadError && onRetry ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{loadError}</span>
          <Button type="button" variant="secondary" className="!px-2 !py-1 !text-xs" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--admin-border)]">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-10" />
              <col />
              <col className="w-[6.5rem]" />
              <col className="w-[7.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[5.5rem]" />
            </colgroup>
            <thead className="sticky top-0 bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allAvailableSelected}
                    onChange={toggleAllAvailable}
                    disabled={available.length === 0}
                    aria-label="Select all visible products"
                    className="rounded border-[var(--admin-border)] text-[#0058be]"
                  />
                </th>
                <th className="px-3 py-2.5">Product</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Cost</th>
                <th className="px-3 py-2.5 text-right">In stock</th>
                <th className="px-3 py-2.5 text-right">Suggested</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6">
                    <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                  </td>
                </tr>
              ) : available.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-[var(--admin-muted)]">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                available.map((p) => {
                  const id = normId(p.id);
                  const hasStock = p.currentStock != null && p.currentStock !== '';
                  const stock = hasStock ? Number(p.currentStock) : null;
                  const suggested = resolveSuggestedQty(p);
                  const cost = Number(p.unitCost ?? p.referenceImportPrice);
                  const low =
                    p.lowStock ||
                    (suggested != null && suggested > 0);
                  return (
                    <tr
                      key={id}
                      className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select ${p.name}`}
                          className="rounded border-[var(--admin-border)] text-[#0058be]"
                        />
                      </td>
                      <td className="min-w-0 px-3 py-2">
                        <div className="truncate font-medium text-[var(--admin-text)]">{p.name}</div>
                        <div className="truncate font-mono text-xs text-[var(--admin-subtle)]">
                          {p.code}
                          {p.barcode ? ` · ${p.barcode}` : ''}
                          {p.categoryName ? ` · ${p.categoryName}` : ''}
                        </div>
                        {p.priorityReason ? (
                          <div className="mt-1 truncate text-[11px] font-medium text-[#0058be]">
                            {p.priorityReason}
                            {p.soldLast30Days != null ? ` · Sold 30d: ${p.soldLast30Days}` : ''}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-[var(--admin-muted)]">{unitLabel(p.unit)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--admin-muted)]">
                        {Number.isFinite(cost) && cost > 0 ? formatVnd(cost) : '—'}
                      </td>
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
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-[#0058be]">
                        {suggested ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingProduct(p)}
                          className="inline-flex items-center justify-center rounded-md border border-[var(--admin-border)] bg-white px-2 py-1 text-xs font-semibold text-[#0058be] hover:border-[#0058be]/40 hover:bg-[#f0f6ff]"
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-border)] bg-[#f7f9fb]/60 px-3 py-2 text-xs text-[var(--admin-muted)]">
          <span>
            Showing {available.length} · page {page}
            {totalPages ? ` of ${totalPages}` : ''}
            {totalRecords ? ` (${totalRecords} total)` : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              className="!px-2 !py-1 !text-xs"
              disabled={loading || page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="!px-2 !py-1 !text-xs"
              disabled={loading || !totalPages || page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AddQtyModal
        open={Boolean(pendingProduct)}
        product={pendingProduct}
        defaultQty={pendingProduct ? resolveSuggestedQty(pendingProduct) || 1 : 1}
        onConfirm={confirmAddOne}
        onCancel={() => setPendingProduct(null)}
      />
    </div>
  );
}
