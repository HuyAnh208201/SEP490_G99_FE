import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteUser, fetchUsers, updateUserStatus } from '../../api/users.js';
import { fetchBranches } from '../../api/branches.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { canManageTeamMember } from '../../lib/teamPermissions.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import CreateUserModal from '../../components/domain/CreateUserModal.jsx';
import CriticalUserActionModal from '../../components/domain/CriticalUserActionModal.jsx';
import UserDetailDrawer from '../../components/domain/UserDetailDrawer.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';

const ROLE_FILTERS = [
  { id: 'all', label: 'All roles' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'DIRECTOR', label: 'Director' },
  { id: 'PROMOTION_DIRECTOR', label: 'Promotion director' },
  { id: 'WAREHOUSE_MANAGER', label: 'Warehouse' },
  { id: 'BRANCH_MANAGER', label: 'Branch manager' },
  { id: 'INVENTORY_STAFF', label: 'Inventory' },
  { id: 'CASHIER', label: 'Cashier' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { has, role } = usePermissions();
  const canCreate = has('USER_DETAILS_EDIT') || has('MANAGE_BRANCH_STAFF_INFO');
  const actorBranchId = currentUser?.branchId ?? currentUser?.branch_id ?? null;
  const currentUserId = currentUser?.id ?? null;
  const [actionLoading, setActionLoading] = useState(null);

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [criticalAction, setCriticalAction] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userList, branchList] = await Promise.all([
        fetchUsers(),
        fetchBranches().catch(() => []),
      ]);
      setUsers(Array.isArray(userList) ? userList : []);
      setBranches(Array.isArray(branchList) ? branchList : []);
    } catch (err) {
      setError(err.message || 'Failed to load team members');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const branchMap = useMemo(() => {
    const map = {};
    (branches || []).forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  const filtered = useMemo(() => {
    let list = users || [];
    if (roleFilter !== 'all') {
      list = list.filter((u) => {
        if (roleFilter === 'DIRECTOR') {
          return ['DIRECTOR', 'PROMOTION_DIRECTOR', 'OWNER'].includes(u.role);
        }
        return u.role === roleFilter;
      });
    }
    if (branchFilter !== 'all') {
      list = list.filter((u) => String(u.branchId) === String(branchFilter));
    }
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        ROLE_LABELS[u.role]?.toLowerCase().includes(q),
    );
  }, [users, query, roleFilter, branchFilter]);

  function isCriticalUser(user) {
    return ['ADMIN', 'DIRECTOR', 'OWNER', 'PROMOTION_DIRECTOR'].includes(user.role);
  }

  async function handleDeactivate(targetUser) {
    if (isCriticalUser(targetUser)) {
      setCriticalAction({ user: targetUser, type: 'DEACTIVATE', label: 'Deactivate' });
      return;
    }
    if (!window.confirm(`Deactivate account for ${targetUser.name}?`)) return;
    setActionLoading(`deactivate-${targetUser.id}`);
    setError('');
    try {
      await updateUserStatus(targetUser.id, false);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(targetUser) {
    if (isCriticalUser(targetUser)) {
      setCriticalAction({ user: targetUser, type: 'DELETE', label: 'Delete' });
      return;
    }
    if (!window.confirm(`Delete account for ${targetUser.name}? This cannot be undone.`)) return;
    setActionLoading(`delete-${targetUser.id}`);
    setError('');
    try {
      await deleteUser(targetUser.id);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
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
              <strong>{filtered.length}</strong> of {users?.length ?? 0} members
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
            {ROLE_FILTERS.map((f) => (
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

          {(branches || []).length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
            >
              <option value="all">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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
                              onClick={() => handleDeactivate(u)}
                            >
                              Deactivate
                            </Button>
                          )}
                          {canManageTeamMember(role, actorBranchId, u, currentUserId) && (
                            <Button
                              variant="ghost"
                              className="!px-2 !py-1 !text-red-600"
                              loading={actionLoading === `delete-${u.id}`}
                              onClick={() => handleDelete(u)}
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
