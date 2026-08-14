import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDateTime } from '../../lib/datetime.js';
import {
  APPROVAL_STATUS_OPTIONS,
  approvalStatusMeta,
} from '../../constants/inventoryStaff.js';
import { listReceivingHistoryPage } from '../../api/branchReceiving.js';
import ReceivingReceiptDetailModal from './components/ReceivingReceiptDetailModal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function ReceivingHistoryPage() {
  const location = useLocation();
  const [flash, setFlash] = useState(location.state?.message || '');
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const pageData = useServerPage(listReceivingHistoryPage, { search: debouncedSearch, status: statusFilter });
  const { items: filteredRows, loading, error } = pageData;

  return (
    <div className="w-full">
      <PageHeader
        title="Receiving History"
        description="Completed receipts and quantity variances. Branch managers can view the same report."
      />

      {flash && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {flash}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Receipt ID, Dispatch Order or Request ID"
            className={`${selectClass} w-72`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {APPROVAL_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value || 'all'}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{pageData.totalRecords}</strong> receipts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Receipt ID</th>
                <th className="px-4 py-3">Dispatch Order ID</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Received Date</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3">Received By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : filteredRows.map((r) => {
                    const meta = approvalStatusMeta(r.status);
                    return (
                      <tr
                        key={r.receiptId}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {r.receiptCode}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                          {r.dispatchNumber || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                          {r.requestNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDateTime(r.receivedAt)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.productCount ?? 0}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {r.receivedByName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              variant="secondary"
                              className="!px-3 !py-1 !text-xs"
                              onClick={() => setDetailId(r.receiptId)}
                            >
                              View Details
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && filteredRows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No receiving history yet.
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>

      <ReceivingReceiptDetailModal
        open={Boolean(detailId)}
        receiptId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
