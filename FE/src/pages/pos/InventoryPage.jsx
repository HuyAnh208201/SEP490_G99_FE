import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatVnd } from '../../lib/money.js';
import { fetchProductsPage } from '../../api/products.js';
import { fetchCategories } from '../../api/categories.js';
import { hasPromo, unitPrice } from './posProduct.js';
import { toPosProduct } from './posProduct.js';
import PosPageTitle from './components/PosPageTitle.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

export default function InventoryPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [allProducts, setAllProducts] = useState([]);
  const [, setLoadError] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const fetchPosProducts = useCallback(async (params) => {
    const page = await fetchProductsPage(params);
    return { ...page, items: page.items.map(toPosProduct) };
  }, []);
  const pageData = useServerPage(fetchPosProducts, {
    search: debouncedQuery,
    categoryId: category === 'ALL' ? undefined : category,
  });
  const { items: products, loading, error: loadError } = pageData;

  useEffect(() => {
    let active = true;
    fetchCategories()
      .then((rows) => {
        if (!active) return;
        setAllProducts(rows.map((item) => ({ categoryId: item.id, category: item.name })));
        setLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        setAllProducts([]);
        setLoadError(
          `Could not load products from the server: ${error.message || 'connection error'}. Check the backend (port 4313) then reload the page.`,
        );
      })
      .finally(() => {
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Map(allProducts.map((product) => [product.categoryId, {
      id: product.categoryId,
      name: product.category,
    }])).values()).filter((item) => item.id != null),
    [allProducts],
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="Inventory Products" />

      <section className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--admin-border)] p-4">
          <div className="relative min-w-[240px] flex-1">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-subtle)]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, code, or barcode..."
              className="w-full rounded-lg border border-[var(--admin-border)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-muted)] outline-none focus:border-[var(--admin-brand)]"
          >
            <option value="ALL">All Categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-[var(--admin-subtle)]">
            {pageData.totalRecords} products
          </span>
        </div>

        {loadError && (
          <p className="border-b border-[var(--admin-border)] bg-amber-50 px-4 py-3 text-xs text-amber-800">
            {loadError}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-[11px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const lowStock = product.stock <= 10;
                return (
                  <tr key={product.id} className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-subtle)]">{product.code}</td>
                    <td className="min-w-[240px] px-4 py-3 font-medium">
                      {product.name}
                      {hasPromo(product) && (
                        <span className="ml-2 rounded border border-[var(--admin-brand)]/30 bg-[#0058be]/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--admin-brand)]">
                          Promo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">{product.barcode}</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{product.category}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--admin-brand)]">{formatVnd(unitPrice(product))}</td>
                    <td className="px-4 py-3 capitalize text-[var(--admin-muted)]">{product.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        lowStock
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#0d7a3e]/10 text-[var(--admin-success)]'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!products.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-subtle)]">
                    {loading
                      ? 'Loading products from the server…'
                      : loadError
                        ? 'No data to display.'
                        : 'No matching products.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden items-center justify-between border-t border-[var(--admin-border)] px-4 py-3 text-xs text-[var(--admin-subtle)]">
          <span>1–{products.length} of {allProducts.length}</span>
          <div className="flex gap-1">
            <button type="button" disabled className="h-8 w-8 rounded-lg border border-[var(--admin-border)] disabled:opacity-40">‹</button>
            <button type="button" className="h-8 w-8 rounded-lg bg-[var(--admin-brand)] font-semibold text-white">1</button>
            <button type="button" disabled className="h-8 w-8 rounded-lg border border-[var(--admin-border)] disabled:opacity-40">›</button>
          </div>
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </section>
    </div>
  );
}
