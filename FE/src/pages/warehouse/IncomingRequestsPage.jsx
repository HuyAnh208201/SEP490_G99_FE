import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatDate, formatDateTime } from '../../lib/datetime.js';
import {
  WM_INCOMING_STATUS_OPTIONS,
  statusMeta,
  canApproveRequest,
} from '../../constants/purchaseRequests.js';
import {
  listRequestsPage,
  getRequest,
  fetchRequestBranches,
} from '../../api/purchaseRequests.js';
import IncomingRequestDetailModal from './components/IncomingRequestDetailModal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function IncomingRequestsPage() {
  const { has } = usePermissions();
  const canApprove = canApproveRequest(has);
  const [branches, setBranches] = useState([]);
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(listRequestsPage, { search: debouncedQuery, status: statusFilter, branchId: branchFilter });
  const { items: rows, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  useEffect(() => {
    fetchRequestBranches().then(setBranches).catch(() => {});
  }, []);

  const filteredRows = rows;

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

  return (
    <div className="w-full">
      <PageHeader title="Incoming Requests" />

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
            {WM_INCOMING_STATUS_OPTIONS.map((o) => (
              <option key={o.value || '__all__'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search requests…" className={selectClass} />

          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{pageData.totalRecords}</strong> {pageData.totalRecords === 1 ? 'request' : 'requests'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Requested date</th>
                <th className="px-4 py-3">Desired receive</th>
                <th className="px-4 py-3 text-right">Total Products</th>
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
                : filteredRows.map((r) => {
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
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
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
