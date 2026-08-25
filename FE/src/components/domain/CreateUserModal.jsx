import { useEffect, useMemo, useState } from 'react';
import { createUser, fetchCriticalRoleSlots, fetchMe } from '../../api/users.js';
import { fetchBranches, fetchBranchById } from '../../api/branches.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import {
  PHONE_PATTERN,
  buildCreateUserPayload,
  getAssignableRoles,
  normalizeWebRole,
  requiresBranch,
  roleLabel,
} from '../../constants/userRoles.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

const EMPTY = {
  email: '',
  userName: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: '',
  branchId: '',
};

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text)] focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function emailToUsername(email) {
  const local = email.split('@')[0] || '';
  return local.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
}

export default function CreateUserModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const { role: actorRole } = usePermissions();
  const webRole = normalizeWebRole(actorRole);
  const actorBranchId = user?.branchId ?? user?.branch_id ?? null;

  const [step, setStep] = useState('details');
  const [form, setForm] = useState(EMPTY);
  const [branches, setBranches] = useState([]);
  const [roleSlots, setRoleSlots] = useState(null);
  const [lockedBranchName, setLockedBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userNameEdited, setUserNameEdited] = useState(false);

  const baseRoles = useMemo(() => {
    let list = getAssignableRoles(actorRole);
    if (webRole === 'BRANCH_MANAGER') {
      list = list.filter((r) => r === 'CASHIER' || r === 'INVENTORY_STAFF');
    }
    return list;
  }, [actorRole, webRole]);

  const roles = useMemo(() => {
    let list = baseRoles;
    if (roleSlots) {
      list = list.filter((r) => {
        if (r === 'ADMIN') return roleSlots.adminAvailable;
        if (r === 'DIRECTOR') return roleSlots.directorAvailable;
        if (r === 'WAREHOUSE_MANAGER') return roleSlots.warehouseManagerAvailable;
        return true;
      });
    }
    return list;
  }, [baseRoles, roleSlots]);

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setError('');
    setUserNameEdited(false);
    setRoleSlots(null);
    const resolvedBranchId =
      webRole === 'BRANCH_MANAGER' && actorBranchId ? String(actorBranchId) : '';
    setForm({
      ...EMPTY,
      role: baseRoles[0] || 'CASHIER',
      branchId: resolvedBranchId,
    });
    if (webRole === 'BRANCH_MANAGER' && resolvedBranchId) {
      fetchBranchById(resolvedBranchId)
        .then((b) => setLockedBranchName(b?.name || ''))
        .catch(() =>
          fetchMe().then((me) => {
            if (me?.branchId) {
              return fetchBranchById(me.branchId).then((b) => setLockedBranchName(b?.name || ''));
            }
            return null;
          }),
        );
    } else {
      setLockedBranchName('');
    }
    fetchBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
    fetchCriticalRoleSlots()
      .then((slots) => setRoleSlots(slots))
      .catch(() => setRoleSlots(null));
  }, [open, baseRoles, webRole, actorBranchId]);

  useEffect(() => {
    if (!open || !roles.length) return;
    setForm((current) => {
      if (roles.includes(current.role)) return current;
      const nextRole = roles[0];
      return {
        ...current,
        role: nextRole,
        branchId: requiresBranch(nextRole) ? current.branchId : '',
      };
    });
  }, [open, roles]);

  function patch(updates) {
    setForm((f) => {
      const next = { ...f, ...updates };
      if (updates.email !== undefined) {
        if (!userNameEdited) {
          next.userName = emailToUsername(updates.email);
        }
      }
      return next;
    });
  }

  function goToConfirm(e) {
    e.preventDefault();
    setError('');
    if (!form.email.trim()) {
      setError('Work email is required.');
      return;
    }
    if (!form.firstName.trim() || !form.phone.trim()) {
      setError('First name and phone are required.');
      return;
    }
    if (!new RegExp(PHONE_PATTERN).test(form.phone.trim())) {
      setError('Invalid phone. Use 0912345678 or +84912345678.');
      return;
    }
    if (requiresBranch(form.role) && !form.branchId) {
      setError('Select a branch for this role.');
      return;
    }
    setStep('confirm');
  }

  async function handleCreate() {
    setError('');
    setLoading(true);
    try {
      await createUser(buildCreateUserPayload(form));
      setStep('success');
      onCreated?.();
    } catch (err) {
      const fieldErrors = err.errors ? Object.values(err.errors).join('. ') : '';
      setError(fieldErrors || err.message || 'Unable to create account');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  }

  const branchName =
    lockedBranchName || branches.find((b) => String(b.id) === String(form.branchId))?.name;
  const branchLocked = webRole === 'BRANCH_MANAGER';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'success' ? 'Account created' : 'Add team member'}
      description={
        step === 'success'
          ? 'Temporary password was sent to their email. They should change it after first login.'
          : 'Create accounts for directors, warehouse managers, branch staff, and more.'
      }
      size={step === 'confirm' ? 'md' : 'lg'}
    >
      {step === 'details' && (
        <form onSubmit={goToConfirm} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Work email" required className="sm:col-span-2">
              <input
                type="email"
                required
                autoFocus
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="name@chainstore.vn"
                className={inputClass}
              />
            </FormField>

            <FormField label="First name" required>
              <input
                required
                value={form.firstName}
                onChange={(e) => patch({ firstName: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Last name">
              <input
                value={form.lastName}
                onChange={(e) => patch({ lastName: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Phone" required>
              <input
                required
                pattern={PHONE_PATTERN}
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Role" required>
              <select
                required
                value={form.role}
                onChange={(e) =>
                  patch({
                    role: e.target.value,
                    branchId:
                      webRole === 'BRANCH_MANAGER' && actorBranchId
                        ? String(actorBranchId)
                        : '',
                  })
                }
                className={inputClass}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Username">
              <input
                value={form.userName}
                onChange={(e) => {
                  setUserNameEdited(true);
                  patch({ userName: e.target.value });
                }}
                className={`${inputClass} font-mono text-sm`}
              />
            </FormField>

            {requiresBranch(form.role) && (
              <FormField
                label="Branch"
                required
                className="sm:col-span-2"
              >
                {branchLocked ? (
                  <input
                    readOnly
                    value={branchName || (form.branchId ? `Branch #${form.branchId}` : '—')}
                    className={`${inputClass} bg-[#f7f9fb]`}
                  />
                ) : (
                  <select
                    value={form.branchId}
                    onChange={(e) => patch({ branchId: e.target.value })}
                    required
                    className={inputClass}
                  >
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4 text-sm">
            <p className="mb-3 font-medium text-[var(--admin-text)]">Confirm before creating account</p>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Email</dt>
                <dd className="font-medium text-[var(--admin-text)]">{form.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Name</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {[form.firstName, form.lastName].filter(Boolean).join(' ')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Role</dt>
                <dd className="font-medium text-[var(--admin-text)]">{roleLabel(form.role)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Username</dt>
                <dd className="font-mono text-sm">{form.userName || emailToUsername(form.email)}</dd>
              </div>
              {branchName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--admin-muted)]">Branch</dt>
                  <dd className="font-medium text-[var(--admin-text)]">{branchName}</dd>
                </div>
              )}
            </dl>
          </div>

          <p className="text-sm text-[var(--admin-muted)]">
            A temporary password will be emailed to{' '}
            <strong className="text-[var(--admin-text)]">{form.email}</strong>.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setStep('details')}>
              Back
            </Button>
            <Button onClick={handleCreate} loading={loading}>
              Create account
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-[var(--admin-muted)]">
            Account created for <strong className="text-[var(--admin-text)]">{form.email}</strong>.
            They will receive login credentials by email.
          </p>
          <div className="flex justify-center pt-2">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
