import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import {
  DISPATCH_STATUS_OPTIONS,
  WAREHOUSE_DISPATCH_STATUS_OPTIONS,
  dispatchStatusMeta,
  isWarehouseEditableStatus,
  normalizeDispatchStatus,
} from '../../constants/dispatch.js';
import { listDispatchOrdersPage, updateDispatchStatus, getDispatchOrder } from '../../api/dispatch.js';
import DispatchOrderDetailModal from './components/DispatchOrderDetailModal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function DispatchOrdersPage() {
  const confirmSave = useSaveConfirmation();
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [draftStatus, setDraftStatus] = useState({});

  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(listDispatchOrdersPage, {
    search: debouncedQuery,
    status: statusFilter ? statusFilter.toUpperCase() : undefined,
  });
  const { items: rows, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  useEffect(() => {
    const drafts = {};
    rows.forEach((r) => { drafts[r.id] = normalizeDispatchStatus(r.status) || 'preparing'; });
    setDraftStatus(drafts);
  }, [rows]);

  const filteredRows = rows;

  async function openDetail(order) {
    setOpeningId(order.id);
    setActionError('');
    try {
      const full = await getDispatchOrder(order.id);
      setDetail(full);
    } catch (err) {
      setActionError(err?.message || 'Failed to load dispatch details');
    } finally {
      setOpeningId(null);
    }
  }

  async function applyStatus(order) {
    const next = draftStatus[order.id];
    if (!next || normalizeDispatchStatus(order.status) === next) return;
    const confirmed = await confirmSave({
      title: 'Confirm dispatch status',
      message: `Change ${order.dispatchNumber || 'this dispatch order'} status to ${dispatchStatusMeta(next).label}?`,
      confirmLabel: 'Yes, update status',
    });
    if (!confirmed) return;
    setUpdatingId(order.id);
    setActionError('');
    try {
      await updateDispatchStatus(order.id, next);
      load();
    } catch (err) {
      setActionError(err?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  function storesOf(order) {
    return [...new Set((order.requests || []).map((r) => r.branchName).filter(Boolean))];
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Dispatch Orders"
        description="Monitor outbound dispatch orders. Select status from the list — delivered is set only when branch staff confirms receipt."
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            {DISPATCH_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dispatches…" className={selectClass} />
          <span className="ml-auto text-sm text-[var(--admin-muted)]">
            <strong>{pageData.totalRecords}</strong> dispatch orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Dispatch ID</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : filteredRows.map((r) => {
                    const meta = dispatchStatusMeta(r.status);
                    const editable = isWarehouseEditableStatus(r.status);
                    const currentDraft = draftStatus[r.id] || normalizeDispatchStatus(r.status);
                    const dirty = normalizeDispatchStatus(r.status) !== currentDraft;
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                          {r.dispatchNumber}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {(r.requests || [])[0]?.requestNumber || '—'}
                        </td>
                        <td className="px-4 py-3">{storesOf(r)[0] || '—'}</td>
                        <td className="px-4 py-3">
                          {editable ? (
                            <select
                              value={currentDraft}
                              onChange={(e) =>
                                setDraftStatus((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              className={`${selectClass} min-w-[10rem]`}
                            >
                              {WAREHOUSE_DISPATCH_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          )}
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
                            {editable && (
                              <Button
                                className="!px-3 !py-1 !text-xs"
                                loading={updatingId === r.id}
                                disabled={!dirty}
                                onClick={() => applyStatus(r)}
                              >
                                Apply
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
              No dispatch orders yet.
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>

      <DispatchOrderDetailModal
        open={Boolean(detail)}
        order={detail}
        onClose={() => setDetail(null)}
        onChanged={load}
      />
    </div>
  );
}
