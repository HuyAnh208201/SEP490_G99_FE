import { useCallback, useEffect, useState } from 'react';
import { fetchBranches, updateBranchStatus } from '../../api/branches.js';
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

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [statusLoading, setStatusLoading] = useState(null);

  const load = useCallback(async () => {
    if (!canList) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchBranches();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(fieldErrors(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canList]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleActivate(branch) {
    if (!canManage) return;
    if (!window.confirm(`Reactivate branch "${branch.name}"?`)) return;
    setStatusLoading(branch.id);
    setError('');
    try {
      await updateBranchStatus(branch.id, 'ACTIVE');
      await load();
    } catch (err) {
      setError(fieldErrors(err));
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
    <div className="mx-auto max-w-7xl">
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
        <div className="border-b border-[var(--admin-border)] px-4 py-3">
          <p className="text-sm text-[var(--admin-muted)]">
            Total <strong>{items.length}</strong> branches
          </p>
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
                                  isActive ? setSuspendModal(b) : handleActivate(b)
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
    </div>
  );
}
