import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUser } from '../../api/users.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { listDraft } from '../../lib/setupDraft.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';

const ASSIGNABLE_ROLES = {
  ADMIN: ['ADMIN', 'DIRECTOR', 'BRANCH_MANAGER', 'WAREHOUSE_MANAGER', 'INVENTORY_STAFF', 'CASHIER', 'CUSTOMER'],
  DIRECTOR: ['DIRECTOR', 'BRANCH_MANAGER', 'WAREHOUSE_MANAGER', 'INVENTORY_STAFF', 'CASHIER', 'CUSTOMER'],
  BRANCH_MANAGER: ['BRANCH_MANAGER', 'INVENTORY_STAFF', 'CASHIER'],
};

function getAssignableRoles(actorRole) {
  const web =
    actorRole === 'MANAGER' ? 'BRANCH_MANAGER' : actorRole === 'OWNER' ? 'DIRECTOR' : actorRole;
  return ASSIGNABLE_ROLES[web] || [];
}

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { role } = usePermissions();
  const roles = getAssignableRoles(role);
  const [branches, setBranches] = useState([]);

  const [form, setForm] = useState({
    userName: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: roles[0] || 'CASHIER',
    branchNote: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setBranches(listDraft('branches'));
  }, []);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await createUser({
        userName: form.userName,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        role: form.role,
      });
      setSuccess(
        'Account created. Default password was emailed if mail is configured. Assign branch when the API supports branchId.',
      );
      setTimeout(() => navigate('/users'), 1500);
    } catch (err) {
      const fieldErrors = err.errors ? Object.values(err.errors).join('. ') : '';
      setError(fieldErrors || err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  }

  const isBranchRole = ['BRANCH_MANAGER', 'INVENTORY_STAFF', 'CASHIER'].includes(form.role);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Create account"
        description="Admin creates Director/BM; Director creates branch staff; BM creates Cashier / Inventory staff."
        actions={
          <Link to="/users">
            <Button variant="secondary">← Back to list</Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Username *
              </span>
              <input
                required
                value={form.userName}
                onChange={update('userName')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>

            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Email *
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                First name *
              </span>
              <input
                required
                value={form.firstName}
                onChange={update('firstName')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Last name
              </span>
              <input
                value={form.lastName}
                onChange={update('lastName')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Phone *
              </span>
              <input
                required
                placeholder="0912345678"
                value={form.phone}
                onChange={update('phone')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Role *
              </span>
              <select
                required
                value={form.role}
                onChange={update('role')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            </label>

            {isBranchRole && (
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Branch assignment (reference)
                </span>
                <select
                  value={form.branchNote}
                  onChange={update('branchNote')}
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
                >
                  <option value="">Select branch (saved when API supports branchId)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--admin-muted)]">
                  Create branches first, then assign BM / Cashier / Inventory staff to them.
                </p>
              </label>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create account
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
