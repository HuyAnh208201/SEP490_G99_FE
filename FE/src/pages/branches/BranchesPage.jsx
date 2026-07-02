import { useCallback, useEffect, useState } from 'react';
import {
  createBranch,
  createBranchManager,
  fetchBranches,
  updateBranch,
  updateBranchStatus,
} from '../../api/branches.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';

const EMPTY = {
  name: '',
  address: '',
  phone: '',
  operatingHours: '',
  status: 'active',
};

const MANAGER_EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

export default function BranchesPage() {
  const { has } = usePermissions();
  const canManage = has('MANAGE_BRANCH_INFORMATION');
  const canList = has('BRANCH_LIST_ADMIN');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [managerBranchId, setManagerBranchId] = useState(null);
  const [managerForm, setManagerForm] = useState(MANAGER_EMPTY);
  const [managerError, setManagerError] = useState('');
  const [managerSaving, setManagerSaving] = useState(false);

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

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updateManager(field) {
    return (e) => setManagerForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function startEdit(branch) {
    setEditingId(branch.id);
    setForm({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      operatingHours: branch.operatingHours || '',
      status: branch.status || 'active',
    });
    setFormError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManage) return;
    setFormError('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      operatingHours: form.operatingHours.trim(),
    };

    try {
      if (editingId) {
        await updateBranch(editingId, { ...payload, status: form.status });
      } else {
        await createBranch(payload);
      }
      cancelEdit();
      await load();
    } catch (err) {
      setFormError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(branch) {
    if (!canManage) return;
    const next = branch.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Set branch "${branch.name}" to ${next}?`)) return;
    try {
      await updateBranchStatus(branch.id, next);
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  }

  function openManagerForm(branchId) {
    setManagerBranchId(branchId);
    setManagerForm(MANAGER_EMPTY);
    setManagerError('');
  }

  async function handleManagerSubmit(e) {
    e.preventDefault();
    setManagerError('');
    setManagerSaving(true);
    try {
      await createBranchManager(managerBranchId, {
        ...managerForm,
        branchId: managerBranchId,
      });
      setManagerBranchId(null);
      await load();
    } catch (err) {
      setManagerError(fieldErrors(err));
    } finally {
      setManagerSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Branches"
        description="Step 4 — create branches, assign managers, and manage active/inactive status."
      />

      {!canList && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Branch list requires Admin list permission. You can still create branches if you have
          manage access — refresh after an Admin shares the list.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {canManage && (
          <Card className="lg:col-span-1">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">
              {editingId ? 'Edit branch' : 'New branch'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Branch name *
                </span>
                <input
                  required
                  value={form.name}
                  onChange={update('name')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Address *
                </span>
                <textarea
                  required
                  rows={2}
                  value={form.address}
                  onChange={update('address')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Phone * (10 digits, starts with 0)
                </span>
                <input
                  required
                  pattern="0[0-9]{9}"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="0912345678"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Operating hours *
                </span>
                <input
                  required
                  value={form.operatingHours}
                  onChange={update('operatingHours')}
                  placeholder="08:00 - 22:00"
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                />
              </label>
              {editingId && (
                <label className="block space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={update('status')}
                    className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              )}
              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {editingId ? 'Save changes' : 'Create branch'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}

        <Card className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} !p-0 overflow-hidden`}>
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
                        <td colSpan={6} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : items.map((b) => (
                      <tr
                        key={b.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-medium">{b.name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                          {b.address || '—'}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{b.phone || '—'}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {b.managerName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={b.status === 'active' ? 'success' : 'danger'}>
                            {b.status || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage && (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => startEdit(b)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => toggleStatus(b)}
                              >
                                Toggle status
                              </Button>
                              {!b.managerId && (
                                <Button
                                  variant="ghost"
                                  className="!px-2 !py-1"
                                  onClick={() => openManagerForm(b.id)}
                                >
                                  Assign BM
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
                {canList ? 'No branches yet.' : 'No branch data available for your role.'}
              </p>
            )}
          </div>
        </Card>
      </div>

      {managerBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-base font-semibold text-[var(--admin-text)]">
              Create branch manager
            </h3>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              POST /api/branches/{managerBranchId}/manager
            </p>
            <form onSubmit={handleManagerSubmit} className="mt-4 space-y-3">
              <input
                required
                placeholder="Full name"
                value={managerForm.fullName}
                onChange={updateManager('fullName')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={managerForm.email}
                onChange={updateManager('email')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Phone"
                value={managerForm.phone}
                onChange={updateManager('phone')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={managerForm.password}
                onChange={updateManager('password')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              />
              <input
                required
                type="password"
                placeholder="Confirm password"
                value={managerForm.confirmPassword}
                onChange={updateManager('confirmPassword')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
              />
              {managerError && <p className="text-sm text-red-600">{managerError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setManagerBranchId(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={managerSaving}>
                  Create manager
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
