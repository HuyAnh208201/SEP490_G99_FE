import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { getConsolidatedPage } from '../../api/purchaseRequests.js';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

/**
 * Màn hình tổng hợp / gom đơn (read-only).
 * Dữ liệu đã được BE gom theo Chi nhánh (địa chỉ) + Danh mục và cộng dồn số lượng.
 * FE hiển thị dạng bảng group-by, hỗ trợ in ấn và xuất Excel (CSV).
 */
export default function ConsolidatedPage() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(getConsolidatedPage, { search: debouncedQuery });
  const { items: rows, loading, error } = pageData;

  // Gom theo chi nhánh để hiển thị dạng cây
  const grouped = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (!map.has(r.branchId)) {
        map.set(r.branchId, {
          branchId: r.branchId,
          branchName: r.branchName,
          address: r.address,
          categories: [],
          total: 0,
        });
      }
      const g = map.get(r.branchId);
      g.categories.push(r);
      g.total += r.totalQuantity;
    });
    return Array.from(map.values());
  }, [rows]);

  const totals = useMemo(() => {
    const branchCount = pageData.totalRecords;
    const categoryCount = rows.length;
    const totalQty = rows.reduce((s, r) => s + r.totalQuantity, 0);
    return { branchCount, categoryCount, totalQty };
  }, [grouped, pageData.totalRecords, rows]);

  function toggle(id) {
    setExpanded((s) => ({ ...s, [id]: !s[id] }));
  }

  function exportCsv() {
    const header = ['Branch', 'Address', 'Category', 'Products', 'Total quantity'];
    const lines = rows.map((r) => [
      r.branchName,
      r.address,
      r.categoryName,
      r.productCount,
      r.totalQuantity,
    ]);
    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consolidated-import-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <Link to="/warehouse/dispatch-planning">
          <Button variant="secondary">→ Dispatch planning</Button>
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
        <Button onClick={exportCsv}>Export Excel</Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3 print:hidden">
        <StatCard label="Branches" value={loading ? '—' : totals.branchCount} icon="store" />
        <StatCard label="Category groups" value={loading ? '—' : totals.categoryCount} icon="folder" />
        <StatCard label="Total quantity" value={loading ? '—' : totals.totalQty} icon="boxes" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex justify-end border-b border-[var(--admin-border)] p-3 print:hidden">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search branch, category, product…" className="w-full max-w-sm rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Branch / Category</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3 text-right">Total quantity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--admin-border)]">
                    <td colSpan={4} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                    </td>
                  </tr>
                ))
              ) : grouped.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
                    No consolidated data yet (no approved requests).
                  </td>
                </tr>
              ) : (
                grouped.map((g) => (
                  <BranchGroup
                    key={g.branchId}
                    group={g}
                    open={expanded[g.branchId] !== false}
                    onToggle={() => toggle(g.branchId)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} className="print:hidden" />
      </Card>
    </>
  );
}

function BranchGroup({ group, open, onToggle }) {
  return (
    <>
      <tr className="border-t border-[var(--admin-border)] bg-[#0058be]/[0.04]">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 font-semibold text-[var(--admin-text)]"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {group.branchName}
          </button>
        </td>
        <td className="px-4 py-3 text-[var(--admin-muted)]">{group.address}</td>
        <td className="px-4 py-3 text-right text-[var(--admin-subtle)]">
          {group.categories.length} categories
        </td>
        <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#0058be]">{group.total}</td>
      </tr>
      {open &&
        group.categories.map((c) => (
          <tr key={`${group.branchId}-${c.categoryId}`} className="border-t border-[var(--admin-border)]">
            <td className="px-4 py-2.5 pl-12 text-[var(--admin-text)]">{c.categoryName}</td>
            <td className="px-4 py-2.5 text-xs text-[var(--admin-subtle)]">
              {c.products?.map((p) => `${p.name} (${p.quantity})`).join(', ')}
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums text-[var(--admin-muted)]">{c.productCount}</td>
            <td className="px-4 py-2.5 text-right font-medium tabular-nums">{c.totalQuantity}</td>
          </tr>
        ))}
    </>
  );
}
