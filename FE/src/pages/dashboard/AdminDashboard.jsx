import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminDashboard } from '../../api/dashboards.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import DashboardKpiGrid from '../../components/dashboard/DashboardKpiGrid.jsx';
import DashboardQuickLinks from '../../components/dashboard/DashboardQuickLinks.jsx';
import { ROLE_LABELS } from '../../constants/userRoles.js';

const SHORTCUTS = [
  { to: '/users', label: 'Team & accounts' },
  { to: '/branches', label: 'Branches' },
  { to: '/catalog/products', label: 'Products' },
  { to: '/promotions', label: 'Promotions' },
  { to: '/system/settings', label: 'System settings' },
];

function formatRole(role) {
  return ROLE_LABELS[role] || role;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminDashboard()
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load admin dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const kpis = [
    {
      key: 'active',
      label: 'Active accounts',
      value: loading ? '…' : data?.activeAccounts ?? '—',
      icon: 'users',
      hint: 'Web staff accounts',
    },
    {
      key: 'locked',
      label: 'Locked accounts',
      value: loading ? '…' : data?.lockedAccounts ?? '—',
      icon: 'users',
      hint: 'Need review',
    },
    {
      key: 'activeBranches',
      label: 'Active branches',
      value: loading ? '…' : data?.activeBranches ?? '—',
      icon: 'store',
      hint: 'Operating locations',
    },
    {
      key: 'noBm',
      label: 'Branches without BM',
      value: loading ? '…' : data?.branchesWithoutManager ?? '—',
      icon: 'staff',
      hint: 'Coverage gaps',
    },
    {
      key: 'missingBranch',
      label: 'Users missing branch',
      value: loading ? '…' : data?.usersMissingBranch ?? '—',
      icon: 'request',
      hint: 'BM / IS / Cashier',
    },
    {
      key: 'suspended',
      label: 'Suspended branches',
      value: loading ? '…' : data?.suspendedBranches ?? '—',
      icon: 'store',
      hint: 'Not operating',
    },
  ];

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="System administration"
        description="Access control, branch coverage, and accounts that need attention."
      />

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <DashboardKpiGrid items={kpis} columnsClass="sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" />

      <div className="grid gap-4 lg:grid-cols-3 w-full">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Branch coverage</h2>
            <p className="text-xs text-[var(--admin-muted)]">Manager assignment and staff headcount per location.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Branch</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Manager</th>
                  <th className="px-4 py-2 text-right">Staff</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : (data?.branchCoverage || []).map((row) => (
                      <tr key={row.branchId} className="border-t border-[var(--admin-border)]">
                        <td className="px-4 py-2.5 font-medium text-[var(--admin-text)]">{row.branchName}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={String(row.status).toUpperCase() === 'ACTIVE' ? 'success' : 'soon'}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--admin-muted)]">
                          {row.hasBranchManager ? row.managerName || 'Assigned' : '— Missing'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.staffCount}</td>
                      </tr>
                    ))}
                {!loading && !(data?.branchCoverage || []).length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
                      No branches found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Role distribution</h2>
            <ul className="mt-3 space-y-2">
              {(data?.roleDistribution || []).map((row) => (
                <li
                  key={row.role}
                  className="flex items-center justify-between rounded-lg bg-[#f7f9fb] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--admin-muted)]">{formatRole(row.role)}</span>
                  <span className="font-semibold tabular-nums text-[var(--admin-text)]">{row.count}</span>
                </li>
              ))}
              {!loading && !(data?.roleDistribution || []).length ? (
                <li className="text-sm text-[var(--admin-muted)]">No staff accounts.</li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Attention queue</h2>
            <ul className="mt-3 space-y-2">
              {(data?.attentionItems || []).slice(0, 8).map((item, idx) => (
                <li key={`${item.type}-${idx}`}>
                  <Link
                    to={item.href || '/users'}
                    className="block rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-text)] hover:border-[var(--admin-brand)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {!loading && !(data?.attentionItems || []).length ? (
                <li className="text-sm text-emerald-700">No open coverage issues.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>

      <DashboardQuickLinks links={SHORTCUTS} title="Admin tools" />
    </div>
  );
}
