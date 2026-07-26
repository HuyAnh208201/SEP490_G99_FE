import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { fetchWarehouseInventoryPage } from '../../api/inventory.js';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function WarehouseInventoryPage() {
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const pageData = useServerPage(fetchWarehouseInventoryPage, {
    search: debouncedSearch,
    lowStockOnly: lowStockOnly || undefined,
  });
  const { items: rows, loading, error } = pageData;
  const filtered = rows;

  const lowStockCount = rows.filter((r) => r.lowStock).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central inventory"
        description="Central warehouse stock levels used when approving branch import requests."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">SKUs tracked</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--admin-text)]">{pageData.totalRecords}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">Low stock</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{lowStockCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">Total units</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--admin-text)]">
            {rows.reduce((sum, r) => sum + (r.quantity || 0), 0).toLocaleString('en-US')}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or product name…"
            className={`min-w-[220px] flex-1 ${selectClass}`}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--admin-muted)]">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-[var(--admin-border)]"
            />
            Low stock only
          </label>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">Loading inventory…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">No inventory records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f7f9fb] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Reorder point</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.inventoryId || row.productId} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.productCode || '—'}</td>
                    <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{row.productName || '—'}</td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">{row.unit || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{row.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-right text-[var(--admin-muted)]">{row.reorderPoint ?? 0}</td>
                    <td className="px-4 py-3">
                      {row.lowStock ? (
                        <Badge tone="warning">Low stock</Badge>
                      ) : (
                        <Badge tone="success">In stock</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>
    </div>
  );
}
