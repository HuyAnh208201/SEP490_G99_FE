import { useEffect, useMemo, useState } from 'react';
import { deleteUser, fetchUsersPage, updateUserStatus } from '../../api/users.js';
import { fetchBranches } from '../../api/branches.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { canManageTeamMember } from '../../lib/teamPermissions.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import CreateUserModal from '../../components/domain/CreateUserModal.jsx';
import CriticalUserActionModal from '../../components/domain/CriticalUserActionModal.jsx';
import UserDetailDrawer from '../../components/domain/UserDetailDrawer.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';
import Pagination from '../../components/ui/Pagination.jsx';
import useDebouncedValue from '../../hooks/useDebouncedValue.js';
import useServerPage from '../../hooks/useServerPage.js';

const ROLE_FILTERS = [
  { id: 'all', label: 'All roles' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'DIRECTOR', label: 'Director' },
  { id: 'WAREHOUSE_MANAGER', label: 'Warehouse' },
  { id: 'BRANCH_MANAGER', label: 'Branch manager' },
  { id: 'INVENTORY_STAFF', label: 'Inventory' },
  { id: 'CASHIER', label: 'Cashier' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { has, role } = usePermissions();
  const canCreate = has('USER_DETAILS_EDIT') || has('MANAGE_BRANCH_STAFF_INFO');
  const isBranchManager = role === 'BRANCH_MANAGER';
  const actorBranchId = currentUser?.branchId ?? currentUser?.branch_id ?? null;
  const currentUserId = currentUser?.id ?? null;
  const [actionLoading, setActionLoading] = useState(null);

  const [branches, setBranches] = useState([]);
  const [actionError, setActionError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [criticalAction, setCriticalAction] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const debouncedQuery = useDebouncedValue(query);
  const pageData = useServerPage(fetchUsersPage, {
    search: debouncedQuery,
    role: roleFilter,
    branchId: branchFilter,
  });
  const { items: users, loading, reload: load } = pageData;
  const error = actionError || pageData.error;

  const roleFilters = useMemo(() => {
    if (!isBranchManager) return ROLE_FILTERS;
    return ROLE_FILTERS.filter((f) =>
      ['all', 'ADMIN', 'DIRECTOR', 'BRANCH_MANAGER', 'INVENTORY_STAFF', 'CASHIER'].includes(
        f.id,
      ),
    );
  }, [isBranchManager]);

  const visibleBranches = useMemo(() => {
    if (!isBranchManager) return branches || [];
    return (branches || []).filter((b) => String(b.id) === String(actorBranchId));
  }, [branches, isBranchManager, actorBranchId]);

  useEffect(() => {
    if (isBranchManager) {
      setBranchFilter('all');
    }
  }, [isBranchManager]);

  useEffect(() => {
    fetchBranches().then((data) => setBranches(Array.isArray(data) ? data : [])).catch(() => setBranches([]));
  }, []);

  const branchMap = useMemo(() => {
    const map = {};
    (branches || []).forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  const filtered = users.filter((user) => user.role !== 'CUSTOMER');

  function isCriticalUser(user) {
    return ['ADMIN', 'DIRECTOR', 'OWNER', 'PROMOTION_DIRECTOR'].includes(user.role);
  }

  function requestDeactivate(targetUser) {
    if (isCriticalUser(targetUser)) {
      setCriticalAction({ user: targetUser, type: 'DEACTIVATE', label: 'Deactivate' });
      return;
    }
    setConfirmAction({
      type: 'deactivate',
      user: targetUser,
      title: 'Deactivate account',
      message:
        `Deactivate account for ${targetUser.name}?\n\n` +
        'This will immediately block their access, force-close any open shift session, ' +
        'and remove them from current/future published shifts.',
      confirmLabel: 'Confirm',
      danger: false,
    });
  }

  function requestActivate(targetUser) {
    setConfirmAction({
      type: 'activate',
      user: targetUser,
      title: 'Activate account',
      message: `Activate account for ${targetUser.name}? They will regain access immediately.`,
      confirmLabel: 'Confirm',
      danger: false,
    });
  }

  function requestDelete(targetUser) {
    if (isCriticalUser(targetUser)) {
      setCriticalAction({ user: targetUser, type: 'DELETE', label: 'Delete' });
      return;
    }
    setConfirmAction({
      type: 'delete',
      user: targetUser,
      title: 'Delete account',
      message:
        `Delete account for ${targetUser.name}? This cannot be undone.\n\n` +
        'If they have an open shift or published assignments, delete will be blocked — deactivate first.',
      confirmLabel: 'Confirm',
      danger: true,
    });
  }

  async function runConfirmAction() {
    const action = confirmAction;
    if (!action?.user) return;
    const targetUser = action.user;
    setActionLoading(`${action.type}-${targetUser.id}`);
    setActionError('');
    try {
      if (action.type === 'deactivate') {
        await updateUserStatus(targetUser.id, false);
      } else if (action.type === 'activate') {
        await updateUserStatus(targetUser.id, true);
      } else if (action.type === 'delete') {
        await deleteUser(targetUser.id);
      }
      load();
    } catch (err) {
      setActionError(err.message || `Failed to ${action.type} user`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Team & accounts"
        description="Directors, warehouse managers, branch managers, cashiers, and inventory staff — one directory for your chain."
        actions={
          canCreate ? (
            <Button onClick={() => setModalOpen(true)}>+ Add member</Button>
          ) : null
        }
      />

      <Card className="mb-4 !p-0 overflow-hidden">
        <div className="space-y-3 border-b border-[var(--admin-border)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--admin-muted)]">
              <strong>{pageData.totalRecords}</strong> members
            </p>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone…"
              className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {roleFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setRoleFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  roleFilter === f.id
                    ? 'bg-[var(--admin-brand)] text-white'
                    : 'border border-[var(--admin-border)] text-[var(--admin-muted)] hover:border-[#0058be]/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visibleBranches.length > 0 && !isBranchManager && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
            >
              <option value="all">All branches</option>
              {visibleBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {isBranchManager && actorBranchId && (
            <span className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-muted)]">
              {branchMap[actorBranchId] || 'Your branch'} · HQ roles visible
            </span>
          )}
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Branch</th>
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
                : filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-[var(--admin-border)] transition hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{u.name}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{u.email || u.username}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone="brand">{ROLE_LABELS[u.role] || u.role || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {u.branchId ? branchMap[u.branchId] || `#${u.branchId}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.isActive !== false ? 'success' : 'danger'}>
                          {u.isActive !== false ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1"
                            onClick={() => setSelectedUserId(u.id)}
                          >
                            View
                          </Button>
                          {canManageTeamMember(role, actorBranchId, u, currentUserId) && u.isActive !== false && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              loading={actionLoading === `deactivate-${u.id}`}
                              onClick={() => requestDeactivate(u)}
                            >
                              Deactivate
                            </Button>
                          )}
                          {canManageTeamMember(role, actorBranchId, u, currentUserId) && u.isActive === false && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1"
                              loading={actionLoading === `activate-${u.id}`}
                              onClick={() => requestActivate(u)}
                            >
                              Activate
                            </Button>
                          )}
                          {canManageTeamMember(role, actorBranchId, u, currentUserId) && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 !text-red-600"
                              loading={actionLoading === `delete-${u.id}`}
                              onClick={() => requestDelete(u)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
              No members match your filters.
            </p>
          )}
        </div>
        <Pagination {...pageData} onPageChange={pageData.setPage} onSizeChange={pageData.setSize} disabled={loading} />
      </Card>

      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
      />

      <UserDetailDrawer
        userId={selectedUserId}
        branchMap={branchMap}
        actorRole={role}
        actorBranchId={actorBranchId}
        currentUserId={currentUserId}
        onClose={() => setSelectedUserId(null)}
        onChanged={load}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
        title={confirmAction?.title || 'Confirm'}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        danger={Boolean(confirmAction?.danger)}
      />

      <CriticalUserActionModal
        open={Boolean(criticalAction)}
        user={criticalAction?.user}
        actionType={criticalAction?.type}
        actionLabel={criticalAction?.label || 'Confirm'}
        onClose={() => setCriticalAction(null)}
        onConfirm={async (verification) => {
          if (criticalAction?.type === 'DELETE') {
            await deleteUser(criticalAction.user.id, verification);
          } else {
            await updateUserStatus(criticalAction.user.id, false, verification);
          }
          await load();
        }}
      />
    </div>
  );
}
