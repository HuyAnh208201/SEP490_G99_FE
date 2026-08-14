import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe } from '../../api/users.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import {
  PR_STATUS,
  statusMeta,
  canCreateRequest,
  canFilterByBranch,
} from '../../constants/purchaseRequests.js';
import { listRequestsPage, fetchRequestBranches, getRequest } from '../../api/purchaseRequests.js';
import RequestDetailModal from './components/RequestDetailModal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function PurchaseRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has } = usePermissions();

  const currentUserId = user?.id ?? null;
  const [userBranchId, setUserBranchId] = useState(user?.branchId ?? user?.branch_id ?? null);

  const [branches, setBranches] = useState([]);
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [detail, setDetail] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const showBranchFilter = canFilterByBranch(has);
  const showCreate = canCreateRequest(has);
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(listRequestsPage, {
    search: debouncedQuery,
    status: PR_STATUS.DRAFT,
    branchId: showBranchFilter ? branchFilter : undefined,
  });
  const { items: rows, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  useEffect(() => {
    if (userBranchId) return;
    fetchMe()
      .then((me) => {
        if (me?.branchId) setUserBranchId(me.branchId);
      })
      .catch(() => {});
  }, [userBranchId]);

  useEffect(() => {
    if (showBranchFilter) fetchRequestBranches().then(setBranches).catch(() => {});
  }, [showBranchFilter]);

  async function openDetail(request) {
    setOpeningId(request.id);
    setActionError('');
    try {
      const full = await getRequest(request.id);
      setDetail(full);
    } catch (err) {
      setActionError(err?.message || 'Failed to load request details');
    } finally {
      setOpeningId(null);
    }
  }

  function openEdit(request) {
    setDetail(null);
    navigate(`/purchase-requests/${request.id}/edit`);
  }

  return (
    <>
      {showCreate && (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {!userBranchId && (
            <p className="mr-auto text-sm text-amber-700">
              No branch assigned — create request is disabled until your account is linked to a store.
            </p>
          )}
          <Button
            disabled={!userBranchId}
            onClick={() => navigate('/purchase-requests/new')}
          >
            + Create request
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="space-y-2 border-b border-[var(--admin-border)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
          {showBranchFilter && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drafts…" className={selectClass} />

          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{pageData.totalRecords}</strong> drafts
          </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Request #</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Requested date</th>
                <th className="px-4 py-3">Desired receive</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : rows.map((r) => {
                    const meta = statusMeta(r.status);
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
                          {formatDateTime(r.submittedAt || r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDate(r.desiredReceiveDate)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.itemCount}</td>
                        <td className="px-4 py-3">
                          <Badge tone={meta.tone}>{meta.display}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            className="!px-3 !py-1 !text-xs"
                            loading={openingId === r.id}
                            onClick={() => openDetail(r)}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
              No draft import requests yet.
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>

      <RequestDetailModal
        open={Boolean(detail)}
        request={detail}
        currentUserId={currentUserId}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onChanged={load}
      />
    </>
  );
}
