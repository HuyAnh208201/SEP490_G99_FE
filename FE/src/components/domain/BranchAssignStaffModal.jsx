import { useEffect, useMemo, useState } from 'react';
import { assignStaffToBranch } from '../../api/branches.js';
import { createUser } from '../../api/users.js';
import { fetchUsers } from '../../api/users.js';
import {
  PHONE_PATTERN,
  buildCreateUserPayload,
  roleLabel,
} from '../../constants/userRoles.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';

const ROLE_META = {
  manager: {
    title: 'Assign branch manager',
    role: 'BRANCH_MANAGER',
    description: 'Branch manager oversees daily operations at this location.',
  },
  cashier: {
    title: 'Assign cashier',
    role: 'CASHIER',
    description: 'POS staff for this branch.',
  },
  inventory: {
    title: 'Assign inventory staff',
    role: 'INVENTORY_STAFF',
    description: 'Stock and import staff for this branch.',
  },
};

const EMPTY_NEW = {
  email: '',
  userName: '',
  firstName: '',
  lastName: '',
  phone: '',
};

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function fieldErrors(err) {
  if (err?.errors && typeof err.errors === 'object') {
    return Object.values(err.errors).join('. ');
  }
  return err?.message || 'Request failed';
}

function emailToUsername(email) {
  const local = email.split('@')[0] || '';
  return local.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
}

export default function BranchAssignStaffModal({ open, onClose, branch, staffType, branches, onDone }) {
  const meta = ROLE_META[staffType];
  const [mode, setMode] = useState('existing');
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [step, setStep] = useState('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState(null);
  const [replaceConfirm, setReplaceConfirm] = useState(null);

  useEffect(() => {
    if (!open || !meta) return;
    setMode('existing');
    setQuery('');
    setSelectedUserId('');
    setNewForm(EMPTY_NEW);
    setStep('form');
    setError('');
    setTransferConfirm(null);
    fetchUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [open, meta, staffType]);

  const branchMap = useMemo(() => {
    const map = {};
    (branches || []).forEach((b) => {
      map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  const eligibleUsers = useMemo(() => {
    if (!meta) return [];
    return users.filter((u) => u.role === meta.role);
  }, [users, meta]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return eligibleUsers;
    const q = query.toLowerCase();
    return eligibleUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q),
    );
  }, [eligibleUsers, query]);

  const selectedUser = eligibleUsers.find((u) => String(u.id) === String(selectedUserId));

  if (!open || !branch || !meta) return null;

  function patchNew(updates) {
    setNewForm((f) => {
      const next = { ...f, ...updates };
      if (updates.email !== undefined) {
        next.userName = emailToUsername(updates.email);
      }
      return next;
    });
  }

  async function assignExisting(user, { forceTransfer = false, replaceExisting = false } = {}) {
    if (!user) return;
    if (
      meta.role === 'BRANCH_MANAGER' &&
      branch.managerId &&
      String(branch.managerId) !== String(user.id) &&
      !replaceExisting
    ) {
      setReplaceConfirm({ user });
      return;
    }
    if (user.branchId && String(user.branchId) !== String(branch.id) && !forceTransfer) {
      const fromName = branchMap[user.branchId] || `Branch #${user.branchId}`;
      setTransferConfirm({ user, fromName });
      return;
    }
    setLoading(true);
    setError('');
    try {
      await assignStaffToBranch(branch.id, {
        userId: user.id,
        role: meta.role,
        replaceExisting: replaceExisting || Boolean(branch.managerId),
      });
      onDone?.();
      onClose();
    } catch (err) {
      const msg = fieldErrors(err);
      if (msg.includes('already has a manager') && meta.role === 'BRANCH_MANAGER') {
        setReplaceConfirm({ user });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
      setTransferConfirm(null);
      setReplaceConfirm(null);
    }
  }

  function goToConfirmNew(e) {
    e.preventDefault();
    setError('');
    if (!newForm.email.trim() || !newForm.firstName.trim() || !newForm.phone.trim()) {
      setError('Email, first name, and phone are required.');
      return;
    }
    if (!new RegExp(PHONE_PATTERN).test(newForm.phone.trim())) {
      setError('Invalid phone. Use 0912345678 or +84912345678.');
      return;
    }
    setStep('confirm');
  }

  async function createNew() {
    if (meta.role === 'BRANCH_MANAGER' && branch.managerId) {
      setError('This branch already has a manager. Assign an existing manager or replace the current one.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createUser(
        buildCreateUserPayload({
          ...newForm,
          role: meta.role,
          branchId: String(branch.id),
        }),
      );
      setStep('success');
      onDone?.();
    } catch (err) {
      setError(fieldErrors(err));
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === 'success' ? 'Staff assigned' : meta.title}
      description={
        step === 'success'
          ? 'Account created and assigned to this branch.'
          : `${meta.description} Branch: ${branch.name}.`
      }
      size="lg"
    >
      {step === 'form' && (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-[#f7f9fb] p-1">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'existing'
                  ? 'bg-white text-[#0058be] shadow-sm'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]'
              }`}
            >
              Assign existing
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'new'
                  ? 'bg-white text-[#0058be] shadow-sm'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]'
              }`}
            >
              Create new
            </button>
          </div>

          {mode === 'existing' ? (
            <>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${roleLabel(meta.role).toLowerCase()}…`}
                className={inputClass}
              />
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-[var(--admin-border)]">
                {filteredUsers.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-[var(--admin-muted)]">
                    No matching staff found. Try creating a new account.
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const atBranch = u.branchId ? branchMap[u.branchId] : 'Unassigned';
                    const isSelected = String(u.id) === String(selectedUserId);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(String(u.id))}
                        className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[#f0f4f8] ${
                          isSelected ? 'bg-[#e8f2fc] ring-1 ring-inset ring-[#0058be]/30' : ''
                        }`}
                      >
                        <div>
                          <p className="font-medium text-[var(--admin-text)]">{u.name}</p>
                          <p className="text-xs text-[var(--admin-muted)]">{u.email}</p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--admin-subtle)]">{atBranch}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <form onSubmit={goToConfirmNew} className="space-y-3">
              <FormField label="Work email" required>
                <input
                  required
                  type="email"
                  value={newForm.email}
                  onChange={(e) => patchNew({ email: e.target.value })}
                  placeholder="name@chainstore.vn"
                  className={inputClass}
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="First name" required>
                  <input
                    required
                    value={newForm.firstName}
                    onChange={(e) => patchNew({ firstName: e.target.value })}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Last name">
                  <input
                    value={newForm.lastName}
                    onChange={(e) => patchNew({ lastName: e.target.value })}
                    className={inputClass}
                  />
                </FormField>
              </div>
              <FormField label="Phone" required>
                <input
                  required
                  pattern={PHONE_PATTERN}
                  value={newForm.phone}
                  onChange={(e) => patchNew({ phone: e.target.value })}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Username">
                <input
                  value={newForm.userName}
                  onChange={(e) => patchNew({ userName: e.target.value })}
                  className={`${inputClass} font-mono text-sm`}
                />
              </FormField>
            </form>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {mode === 'existing' ? (
              <Button
                disabled={!selectedUser}
                loading={loading}
                onClick={() => assignExisting(selectedUser)}
              >
                Assign to branch
              </Button>
            ) : (
              <Button type="button" onClick={goToConfirmNew}>
                Continue
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 'confirm' && mode === 'new' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Email</dt>
                <dd className="font-medium">{newForm.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Name</dt>
                <dd>
                  {[newForm.firstName, newForm.lastName].filter(Boolean).join(' ')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Role</dt>
                <dd>{roleLabel(meta.role)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Branch</dt>
                <dd>{branch.name}</dd>
              </div>
            </dl>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setStep('form')}>
              Back
            </Button>
            <Button onClick={createNew} loading={loading}>
              Create &amp; assign
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--admin-muted)]">
            Staff account created for <strong>{newForm.email}</strong>.
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      )}

      {transferConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[var(--admin-text)]">Transfer staff?</h3>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              <strong>{transferConfirm.user.name}</strong> is currently at{' '}
              <strong>{transferConfirm.fromName}</strong>. Move them to <strong>{branch.name}</strong>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setTransferConfirm(null)}>
                Cancel
              </Button>
              <Button
                loading={loading}
                onClick={() => assignExisting(transferConfirm.user, { forceTransfer: true })}
              >
                Confirm transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {replaceConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[var(--admin-text)]">Replace branch manager?</h3>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              <strong>{branch.name}</strong> already has a manager. Assign{' '}
              <strong>{replaceConfirm.user.name}</strong> as the new manager?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setReplaceConfirm(null)}>
                Cancel
              </Button>
              <Button
                loading={loading}
                onClick={() => assignExisting(replaceConfirm.user, { replaceExisting: true })}
              >
                Replace manager
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
