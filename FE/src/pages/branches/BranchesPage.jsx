import { useCallback, useEffect, useState } from 'react';
import { fetchBranchesPage, updateBranchStatus } from '../../api/branches.js';
import {
  branchStatusLabel,
  branchStatusTone,
  normalizeBranchStatus,
} from '../../lib/branchStatus.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import BranchFormModal from '../../components/domain/BranchFormModal.jsx';
import BranchAssignStaffModal from '../../components/domain/BranchAssignStaffModal.jsx';
import BranchSuspendModal from '../../components/domain/BranchSuspendModal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function BranchesPage() {
  const { has } = usePermissions();
  const canManage = has('MANAGE_BRANCH_INFORMATION');
  const canList = has('BRANCH_LIST_ADMIN') || has('BRANCH_LIST_DIRECTOR');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionError, setActionError] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchBranchesPage, { search: debouncedQuery, status: statusFilter });
  const { items, loading, reload: load } = pageData;
  const error = actionError || pageData.error;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [statusLoading, setStatusLoading] = useState(null);
  const [activateTarget, setActivateTarget] = useState(null);

  function requestActivate(branch) {
    if (!canManage) return;
    setActivateTarget(branch);
  }

  async function confirmActivate() {
    const branch = activateTarget;
    if (!branch) return;
    setStatusLoading(branch.id);
    setActionError('');
    try {
      await updateBranchStatus(branch.id, 'ACTIVE');
      load();
    } catch (err) {
      setActionError(fieldErrors(err));
    } finally {
      setStatusLoading(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(branch) {
    setEditing(branch);
    setFormOpen(true);
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Branches"
        description="Store locations with structured address and operating hours."
        actions={
          canManage ? (
            <Button onClick={openCreate}>+ New branch</Button>
          ) : null
        }
      />

      {!canList && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Branch list requires Admin or Director permission.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-3">
          <p className="text-sm text-[var(--admin-muted)]">Total <strong>{pageData.totalRecords}</strong> branches</p>
          <div className="flex flex-1 justify-end gap-2">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search branches…" className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm">
              <option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Deactivated</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Manager</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : items.map((b) => {
                    const status = normalizeBranchStatus(b.status);
                    const isActive = status === 'ACTIVE';
                    return (
                      <tr
                        key={b.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-medium">{b.name}</td>
                        <td className="max-w-[12rem] truncate px-4 py-3 text-[var(--admin-muted)]">
                          {b.address || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--admin-muted)]">
                          {b.operatingHours || '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{b.phone || '—'}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {b.managerName || (
                            <span className="text-[var(--admin-subtle)]">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={branchStatusTone(status)}>
                            {branchStatusLabel(status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {canManage && (
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end">
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => openEdit(b)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                loading={statusLoading === b.id}
                                onClick={() =>
                                  isActive ? setSuspendModal(b) : requestActivate(b)
                                }
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              {!b.managerId && (
                                <Button
                                  variant="ghost"
                                  className="!px-2 !py-1"
                                  onClick={() => setAssignModal({ branch: b, type: 'manager' })}
                                >
                                  Assign BM
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => setAssignModal({ branch: b, type: 'cashier' })}
                              >
                                + Cashier
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => setAssignModal({ branch: b, type: 'inventory' })}
                              >
                                + Inventory
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
              {canList ? 'No branches yet.' : 'No branch data available for your role.'}
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>

      <BranchFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSaved={load}
      />

      <BranchAssignStaffModal
        open={Boolean(assignModal)}
        branch={assignModal?.branch}
        staffType={assignModal?.type}
        branches={items}
        onClose={() => setAssignModal(null)}
        onDone={load}
      />

      <BranchSuspendModal
        open={Boolean(suspendModal)}
        branch={suspendModal}
        onClose={() => setSuspendModal(null)}
        onDone={load}
      />

      <ConfirmDialog
        open={Boolean(activateTarget)}
        onClose={() => setActivateTarget(null)}
        onConfirm={confirmActivate}
        title="Reactivate branch"
        message={activateTarget ? `Reactivate branch "${activateTarget.name}"?` : ''}
        confirmLabel="Confirm"
      />
    </div>
  );
}
