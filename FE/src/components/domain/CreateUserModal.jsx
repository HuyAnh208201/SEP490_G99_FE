import { useEffect, useMemo, useState } from 'react';
import { createUser } from '../../api/users.js';
import { fetchBranches } from '../../api/branches.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';

const ASSIGNABLE_ROLES = {
  ADMIN: [
    'DIRECTOR',
    'WAREHOUSE_MANAGER',
    'BRANCH_MANAGER',
    'INVENTORY_STAFF',
    'CASHIER',
    'CUSTOMER',
  ],
  DIRECTOR: [
    'DIRECTOR',
    'WAREHOUSE_MANAGER',
    'BRANCH_MANAGER',
    'INVENTORY_STAFF',
    'CASHIER',
    'CUSTOMER',
  ],
  BRANCH_MANAGER: ['INVENTORY_STAFF', 'CASHIER'],
};

const BRANCH_ROLES = ['BRANCH_MANAGER', 'INVENTORY_STAFF', 'CASHIER'];

function getAssignableRoles(actorRole) {
  const web =
    actorRole === 'MANAGER' ? 'BRANCH_MANAGER' : actorRole === 'OWNER' ? 'DIRECTOR' : actorRole;
  return ASSIGNABLE_ROLES[web] || [];
}

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
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function emailToUsername(email) {
  const local = email.split('@')[0] || '';
  return local.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
}

export default function CreateUserModal({ open, onClose, onCreated }) {
  const { role: actorRole } = usePermissions();
  const roles = useMemo(() => getAssignableRoles(actorRole), [actorRole]);

  const [step, setStep] = useState('details');
  const [form, setForm] = useState(EMPTY);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setForm({ ...EMPTY, role: roles[0] || 'CASHIER' });
    setError('');
    fetchBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, [open, roles]);

  function patch(updates) {
    setForm((f) => {
      const next = { ...f, ...updates };
      if (updates.email !== undefined) {
        next.userName = emailToUsername(updates.email);
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
      setError('Full name and phone are required.');
      return;
    }
    if (BRANCH_ROLES.includes(form.role) && !form.branchId) {
      setError('Select a branch for this role.');
      return;
    }
    if (['CASHIER', 'INVENTORY_STAFF'].includes(form.role)) {
      setError(
        'Cashier and inventory staff must be created from Branches (+ Cashier / + Inventory) so they are bound to a branch.',
      );
      return;
    }
    setStep('confirm');
  }

  async function handleCreate() {
    setError('');
    setLoading(true);
    try {
      await createUser({
        userName: form.userName.trim() || emailToUsername(form.email),
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim(),
        role: form.role,
      });
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

  const branchName = branches.find((b) => String(b.id) === String(form.branchId))?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'success' ? 'Invitation sent' : 'Add team member'}
      description={
        step === 'success'
          ? 'The new member can sign in using the credentials sent to their inbox.'
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

            <FormField label="Phone" required hint="e.g. 0912345678">
              <input
                required
                pattern="0[0-9]{9}"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Role" required>
              <select
                required
                value={form.role}
                onChange={(e) => patch({ role: e.target.value, branchId: '' })}
                className={inputClass}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Username" hint="Auto-generated from email; used at sign-in.">
              <input
                value={form.userName}
                onChange={(e) => patch({ userName: e.target.value })}
                className={`${inputClass} font-mono text-sm`}
              />
            </FormField>

            {BRANCH_ROLES.includes(form.role) && branches.length > 0 && (
              <FormField
                label="Branch"
                required={form.role === 'BRANCH_MANAGER'}
                hint={
                  ['CASHIER', 'INVENTORY_STAFF'].includes(form.role)
                    ? 'Use Branches page → + Cashier / + Inventory to create branch-bound staff.'
                    : 'Required for branch manager accounts.'
                }
                className="sm:col-span-2"
              >
                <select
                  value={form.branchId}
                  onChange={(e) => patch({ branchId: e.target.value })}
                  required={form.role === 'BRANCH_MANAGER'}
                  disabled={['CASHIER', 'INVENTORY_STAFF'].includes(form.role)}
                  className={inputClass}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
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
            <p className="mb-3 font-medium text-[var(--admin-text)]">Confirm before sending invitation</p>
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
                <dd className="font-medium text-[var(--admin-text)]">
                  {ROLE_LABELS[form.role] || form.role}
                </dd>
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
            An email with a temporary password and sign-in instructions will be sent to{' '}
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
              Send invitation
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
            Invitation email sent to <strong className="text-[var(--admin-text)]">{form.email}</strong>.
            They will receive login credentials and should change their password after the first sign-in.
          </p>
          <div className="flex justify-center pt-2">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
