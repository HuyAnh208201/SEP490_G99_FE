import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate } from '../../lib/datetime.js';
import {
  PR_STATUS,
  PR_STATUS_OPTIONS,
  statusMeta,
  normalizeStatus,
} from '../../constants/purchaseRequests.js';
import {
  listRequests,
  getRequest,
  approveRequest,
  fetchRequestBranches,
} from '../../api/purchaseRequests.js';
import IncomingRequestDetailModal from './components/IncomingRequestDetailModal.jsx';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function IncomingRequestsPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listRequests();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load requests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchRequestBranches().then(setBranches).catch(() => {});
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && normalizeStatus(r.status) !== statusFilter) return false;
      if (branchFilter && String(r.branchId) !== String(branchFilter)) return false;
      return true;
    });
  }, [rows, statusFilter, branchFilter]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    rows.forEach((r) => {
      const s = normalizeStatus(r.status);
      if (s === PR_STATUS.PENDING) pending += 1;
      if (s === PR_STATUS.APPROVED) approved += 1;
    });
    return { pending, approved };
  }, [rows]);

  async function openDetail(request) {
    setOpeningId(request.id);
    setError('');
    try {
      const full = await getRequest(request.id);
      setDetail(full);
    } catch (err) {
      setError(err?.message || 'Failed to load request details');
    } finally {
      setOpeningId(null);
    }
  }

  async function quickApprove(request) {
    setApprovingId(request.id);
    setError('');
    try {
      await approveRequest(request.id, []);
      await load();
    } catch (err) {
      setError(err?.message || 'Failed to approve request');
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Incoming Requests"
        description="Review branch import requests and approve when warehouse inventory is sufficient."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All stores</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {PR_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{counts.pending}</strong> pending review · <strong>{counts.approved}</strong>{' '}
            approved
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Request Date</th>
                <th className="px-4 py-3 text-right">Total Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
                    const meta = statusMeta(r.status);
                    const isPending = normalizeStatus(r.status) === PR_STATUS.PENDING;
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {r.code}
                        </td>
                        <td className="px-4 py-3 font-medium">{r.branchName}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.itemCount}</td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.display}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              className="!px-3 !py-1 !text-xs"
                              loading={openingId === r.id}
                              onClick={() => openDetail(r)}
                            >
                              View Details
                            </Button>
                            {isPending && (
                              <Button
                                className="!px-3 !py-1 !text-xs"
                                loading={approvingId === r.id}
                                onClick={() => quickApprove(r)}
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && filteredRows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No incoming requests.
            </p>
          )}
        </div>
      </Card>

      <IncomingRequestDetailModal
        open={Boolean(detail)}
        request={detail}
        onClose={() => setDetail(null)}
        onChanged={load}
      />
    </div>
  );
}
