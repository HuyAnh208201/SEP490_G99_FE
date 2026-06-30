import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUser } from '../../api/users.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
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

  const [form, setForm] = useState({
    userName: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: roles[0] || 'CASHIER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await createUser(form);
      setSuccess('Tạo tài khoản thành công. Mật khẩu mặc định đã được gửi qua email (nếu mail được cấu hình).');
      setTimeout(() => navigate('/users'), 1200);
    } catch (err) {
      const fieldErrors = err.errors
        ? Object.values(err.errors).join('. ')
        : '';
      setError(fieldErrors || err.message || 'Không thể tạo tài khoản');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tạo tài khoản"
        description="Admin tạo BM/Director; Director tạo nhân sự chi nhánh; BM tạo Thu ngân / Nhân viên kho."
        actions={
          <Link to="/users">
            <Button variant="secondary">← Danh sách</Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Tên đăng nhập *
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
                Họ *
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
                Tên
              </span>
              <input
                value={form.lastName}
                onChange={update('lastName')}
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Số điện thoại *
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
                Vai trò *
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
              Hủy
            </Button>
            <Button type="submit" loading={loading}>
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
