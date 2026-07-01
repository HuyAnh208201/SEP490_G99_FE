import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers } from '../../api/users.js';
import { useModuleData } from '../../hooks/useModuleData.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';

export default function UsersPage() {
  const { has } = usePermissions();
  const { data: users, loading, error } = useModuleData(fetchUsers, []);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = users || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.role?.toLowerCase().includes(q),
    );
  }, [users, query]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="User management"
        description="Account list synced from /api/auth/get-list-users. Visible to Admin, Director, and Branch Manager."
        actions={
          has('USER_DETAILS_EDIT') ? (
            <Link to="/users/create">
              <Button>+ Create account</Button>
            </Link>
          ) : null
        }
      />

      <Card className="mb-4 !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3">
          <p className="text-sm text-[var(--admin-muted)]">
            Total <strong>{users?.length ?? 0}</strong> accounts
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, role..."
            className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20"
          />
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
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email / Username</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Branch</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-[var(--admin-border)] transition hover:bg-[#f7f9fb]/80"
                    >
                      <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                        {u.name}
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{u.email || u.username}</td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge tone="brand">{ROLE_LABELS[u.role] || u.role || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.isActive !== false ? 'success' : 'danger'}>
                          {u.isActive !== false ? 'Active' : 'Locked'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-muted)]">
                        {u.branchId ? `#${u.branchId}` : '—'}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
              No matching users found.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
