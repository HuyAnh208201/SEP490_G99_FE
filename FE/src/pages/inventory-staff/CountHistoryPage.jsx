import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate } from '../../lib/datetime.js';
import {
  APPROVAL_STATUS_OPTIONS,
  approvalStatusMeta,
} from '../../constants/inventoryStaff.js';
import { listCountHistory } from '../../api/inventoryCount.js';
import CountSessionDetailModal from './components/CountSessionDetailModal.jsx';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function CountHistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listCountHistory();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load count history');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && String(r.status).toUpperCase() !== statusFilter) return false;
      if (term) {
        const hay = `${r.sessionCode || ''} ${r.countedByName || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  return (
    <div className="w-full">
      <PageHeader
        title="Inventory Count History"
        description="Review past inventory count sessions and approval status."
      />

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
            placeholder="Search session ID or counted by"
            className={`${selectClass} w-64`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {APPROVAL_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{filteredRows.length}</strong> sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Count Session ID</th>
                <th className="px-4 py-3">Count Date</th>
                <th className="px-4 py-3">Counted By</th>
                <th className="px-4 py-3 text-right">Total Products</th>
                <th className="px-4 py-3">Approval Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : filteredRows.map((r) => {
                    const meta = approvalStatusMeta(r.status);
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {r.sessionCode}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDate(r.countDate)}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {r.countedByName || '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.totalProducts ?? 0}</td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              variant="secondary"
                              className="!px-3 !py-1 !text-xs"
                              onClick={() => setDetailId(r.id)}
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
              No inventory count sessions yet.
            </p>
          )}
        </div>
      </Card>

      <CountSessionDetailModal
        open={Boolean(detailId)}
        sessionId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />
    </div>
  );
}
