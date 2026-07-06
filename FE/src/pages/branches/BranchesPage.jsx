import { useCallback, useEffect, useState } from 'react';
import {
  createBranch,
  createBranchManager,
  fetchBranches,
  updateBranch,
  updateBranchStatus,
} from '../../api/branches.js';
import { composeAddress, parseAddress } from '../../lib/vietnamAddress.js';
import {
  formatOperatingHours,
  parseOperatingHours,
  validateOperatingHours,
} from '../../lib/operatingHours.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import FormField from '../../components/ui/FormField.jsx';
import OperatingHoursPicker from '../../components/ui/OperatingHoursPicker.jsx';
import VietnamAddressPicker from '../../components/ui/VietnamAddressPicker.jsx';
import BranchStaffModal from '../../components/domain/BranchStaffModal.jsx';

const EMPTY_ADDRESS = { street: '', provinceId: '', districtId: '' };
const EMPTY_HOURS = { open: '08:00', close: '22:00' };

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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [hours, setHours] = useState(EMPTY_HOURS);
  const [status, setStatus] = useState('active');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [managerBranchId, setManagerBranchId] = useState(null);
  const [managerForm, setManagerForm] = useState(MANAGER_EMPTY);
  const [managerError, setManagerError] = useState('');
  const [managerSaving, setManagerSaving] = useState(false);
  const [staffModal, setStaffModal] = useState(null);

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

  function resetForm() {
    setName('');
    setPhone('');
    setAddress(EMPTY_ADDRESS);
    setHours(EMPTY_HOURS);
    setStatus('active');
    setEditingId(null);
    setFormError('');
    setAddressError('');
  }

  function startEdit(branch) {
    setEditingId(branch.id);
    setName(branch.name || '');
    setPhone(branch.phone || '');
    setAddress(parseAddress(branch.address));
    setHours(parseOperatingHours(branch.operatingHours));
    setStatus(branch.status || 'active');
    setFormError('');
    setAddressError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canManage) return;
    setFormError('');
    setAddressError('');

    if (!address.provinceId || !address.districtId) {
      setAddressError('Select province/city and district.');
      return;
    }
    const hoursError = validateOperatingHours(hours.open, hours.close);
    if (hoursError) {
      setFormError(hoursError);
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      address: composeAddress(address),
      phone: phone.trim(),
      operatingHours: formatOperatingHours(hours.open, hours.close),
    };

    try {
      if (editingId) {
        await updateBranch(editingId, { ...payload, status });
      } else {
        await createBranch(payload);
      }
      resetForm();
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

  function updateManager(field) {
    return (e) => setManagerForm((f) => ({ ...f, [field]: e.target.value }));
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

  const inputClass =
    'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Branches"
        description="Store locations with structured address and operating hours."
      />

      {!canList && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Branch list requires Admin permission. Create access still works if you have manage rights.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {canManage && (
          <Card className="lg:col-span-2">
            <h2 className="text-base font-semibold text-[var(--admin-text)]">
              {editingId ? 'Edit branch' : 'New branch'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-5">
              <FormField label="Branch name" required>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ChainStore Nguyß╗àn Huß╗ç"
                  className={inputClass}
                />
              </FormField>

              <VietnamAddressPicker
                street={address.street}
                provinceId={address.provinceId}
                districtId={address.districtId}
                onChange={setAddress}
                locationError={addressError}
              />

              <FormField
                label="Phone"
                required
                hint="10 digits, starts with 0 ΓÇö store hotline."
              >
                <input
                  required
                  pattern="0[0-9]{9}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className={inputClass}
                />
              </FormField>

              <OperatingHoursPicker
                open={hours.open}
                close={hours.close}
                onChange={setHours}
                error={formError && formError.includes('time') ? formError : ''}
              />

              {editingId && (
                <FormField label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
              )}

              {formError && !formError.includes('time') && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" loading={saving}>
                  {editingId ? 'Save changes' : 'Create branch'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}

        <Card className={`${canManage ? 'lg:col-span-3' : 'lg:col-span-5'} !p-0 overflow-hidden`}>
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
                  : items.map((b) => (
                      <tr
                        key={b.id}
                        className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
                      >
                        <td className="px-4 py-3 font-medium">{b.name}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-[var(--admin-muted)]">
                          {b.address || 'ΓÇö'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--admin-muted)]">
                          {b.operatingHours || 'ΓÇö'}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{b.phone || 'ΓÇö'}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {b.managerName || 'ΓÇö'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={b.status === 'active' ? 'success' : 'danger'}>
                            {b.status || 'ΓÇö'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage && (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button variant="ghost" className="!px-2 !py-1" onClick={() => startEdit(b)}>
                                Edit
                              </Button>
                              <Button variant="ghost" className="!px-2 !py-1" onClick={() => toggleStatus(b)}>
                                Toggle status
                              </Button>
                              {!b.managerId && (
                                <Button
                                  variant="ghost"
                                  className="!px-2 !py-1"
                                  onClick={() => {
                                    setManagerBranchId(b.id);
                                    setManagerForm(MANAGER_EMPTY);
                                    setManagerError('');
                                  }}
                                >
                                  Assign BM
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => setStaffModal({ branch: b, type: 'cashier' })}
                              >
                                + Cashier
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                onClick={() => setStaffModal({ branch: b, type: 'inventory' })}
                              >
                                + Inventory
                              </Button>
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
            <h3 className="text-base font-semibold text-[var(--admin-text)]">Create branch manager</h3>
            <form onSubmit={handleManagerSubmit} className="mt-4 space-y-3">
              <input
                required
                placeholder="Full name"
                value={managerForm.fullName}
                onChange={updateManager('fullName')}
                className={inputClass}
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={managerForm.email}
                onChange={updateManager('email')}
                className={inputClass}
              />
              <input
                required
                placeholder="Phone"
                value={managerForm.phone}
                onChange={updateManager('phone')}
                className={inputClass}
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={managerForm.password}
                onChange={updateManager('password')}
                className={inputClass}
              />
              <input
                required
                type="password"
                placeholder="Confirm password"
                value={managerForm.confirmPassword}
                onChange={updateManager('confirmPassword')}
                className={inputClass}
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

      <BranchStaffModal
        open={Boolean(staffModal)}
        branch={staffModal?.branch}
        staffType={staffModal?.type}
        onClose={() => setStaffModal(null)}
        onCreated={load}
      />
    </div>
  );
}
