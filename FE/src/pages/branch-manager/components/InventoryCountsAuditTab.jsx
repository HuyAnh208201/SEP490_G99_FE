import { useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import { formatDate } from '../../../lib/datetime.js';
import { listCountHistoryPage } from '../../../api/inventoryCount.js';
import CountSessionDetailModal from '../../inventory-staff/components/CountSessionDetailModal.jsx';
import useServerPage from '../../../hooks/useServerPage.js';

export default function InventoryCountsAuditTab({
  search = '',
  discrepancy = 'with',
  from = '',
  to = '',
}) {
  const [detailId, setDetailId] = useState(null);

  const pageData = useServerPage(listCountHistoryPage, {
    search,
    discrepancy: discrepancy || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const { items: rows, loading, error } = pageData;

  if (error) {
    return <p className="p-6 text-sm text-red-600">{error}</p>;
  }

  if (loading && rows.length === 0) {
    return <p className="p-6 text-sm text-[var(--admin-muted)]">Loading…</p>;
  }

  if (!loading && rows.length === 0) {
    return (
      <p className="p-6 text-sm text-[var(--admin-muted)]">
        No inventory count sessions match these filters.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full w-full text-left text-sm">
          <thead className="bg-[var(--admin-brand)] text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Session ID</th>
              <th className="px-4 py-3 font-semibold">Count date</th>
              <th className="px-4 py-3 font-semibold">Counted by</th>
              <th className="px-4 py-3 font-semibold text-right">Products</th>
              <th className="px-4 py-3 font-semibold text-right">Variances</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const varianceCount = row.varianceCount ?? 0;
              const hasVariance = row.hasDiscrepancy ?? varianceCount > 0;
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--admin-border)] transition hover:bg-[var(--admin-brand)]/5"
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--admin-brand)]">
                    {row.sessionCode}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-muted)]">{formatDate(row.countDate)}</td>
                  <td className="px-4 py-3">{row.countedByName || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.totalProducts ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {hasVariance ? (
                      <Badge tone="warning">{varianceCount} item(s)</Badge>
                    ) : (
                      <span className="text-[var(--admin-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        className="!px-3 !py-1 !text-xs"
                        onClick={() => setDetailId(row.id)}
                      >
                        View details
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        {...pageData}
        onPageChange={pageData.setPage}
        onSizeChange={pageData.setSize}
        disabled={loading}
      />

      <CountSessionDetailModal
        open={Boolean(detailId)}
        sessionId={detailId}
        onClose={() => setDetailId(null)}
      />
    </>
  );
}
