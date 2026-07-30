import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { useReferenceData } from '../../contexts/ReferenceDataContext.jsx';
import {
  adminApi,
  branchManagerApi,
  directorApi,
  warehouseApi,
} from '../../api/modules.js';
import { fetchBranches } from '../../api/branches.js';
import { fetchUsers } from '../../api/users.js';
import { fetchCampaigns } from '../../api/campaigns.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import Card from '../../components/ui/Card.jsx';
import SetupWorkflowBanner from '../../components/domain/SetupWorkflowBanner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';
import { normalizeWebRole } from '../../constants/userRoles.js';

const ROLE_DASHBOARD = {
  ADMIN: {
    permission: 'ADMIN_DASHBOARD',
    title: 'Admin Dashboard',
    fetch: adminApi.dashboard,
    stats: [
      { key: 'branches', label: 'Branches', icon: 'store', hint: 'Active chain locations' },
      { key: 'users', label: 'Users', icon: 'users', hint: 'System accounts' },
      { key: 'products', label: 'Products', icon: 'package', hint: 'SKU catalog' },
      { key: 'categories', label: 'Categories', icon: 'folder', hint: 'Product groups' },
      { key: 'campaigns', label: 'Campaigns', icon: 'tag', hint: 'Promotions' },
    ],
  },
  DIRECTOR: {
    permission: 'DIRECTOR_DASHBOARD',
    title: 'Executive dashboard',
    fetch: directorApi.dashboard,
    stats: [
      { label: 'Chain revenue', value: '—', icon: 'chart', hint: 'Consolidated reports' },
      { label: 'Branches', value: '—', icon: 'store', hint: 'Performance tracking' },
      { label: 'Promotions', value: '—', icon: 'tag', hint: 'Active campaigns' },
      { label: 'Planning', value: '—', icon: 'plan', hint: 'Import strategy' },
    ],
  },
  BRANCH_MANAGER: {
    permission: 'BRANCH_DASHBOARD',
    title: 'Branch operations',
    fetch: branchManagerApi.dashboard,
    stats: [
      { label: 'Today revenue', value: '—', icon: 'cash', hint: 'POS + shift close' },
      { label: 'Shifts', value: '—', icon: 'clock', hint: 'Shift management' },
      { label: 'Staff', value: '—', icon: 'staff', hint: 'Assignments' },
      { label: 'Import requests', value: '—', icon: 'request', hint: 'Purchase requests' },
    ],
  },
  WAREHOUSE_MANAGER: {
    permission: 'WAREHOUSE_DASHBOARD',
    title: 'Central warehouse',
    fetch: warehouseApi.dashboard,
    stats: [
      { label: 'Inventory', value: '—', icon: 'boxes', hint: 'Central inventory' },
      { label: 'Import requests', value: '—', icon: 'inbox', hint: 'From branches' },
      { label: 'Dispatch', value: '—', icon: 'dispatch', hint: 'Dispatch orders' },
      { label: 'Suppliers', value: '—', icon: 'truck', hint: 'Choose supplier' },
    ],
  },
};

const QUICK_LINKS = {
  ADMIN: [
    { to: '/catalog/categories', label: 'Product categories' },
    { to: '/catalog/products', label: 'Products' },
    { to: '/branches', label: 'Branches' },
    { to: '/users', label: 'Team & accounts' },
    { to: '/promotions', label: 'Promotions' },
  ],
  DIRECTOR: [
    { to: '/director/reports', label: 'Performance reports' },
    { to: '/promotions', label: 'Promotions' },
    { to: '/branches', label: 'Branch list' },
    { to: '/catalog/suppliers', label: 'Suppliers' },
  ],
  BRANCH_MANAGER: [
    { to: '/branch-manager/shifts', label: 'Shifts' },
    { to: '/users', label: 'Team & accounts' },
    { to: '/purchase-requests', label: 'Import requests' },
    { to: '/branch-manager/cash-reconciliation', label: 'Cash Reconciliation' },
  ],
  WAREHOUSE_MANAGER: [
    { to: '/warehouse/inventory', label: 'Inventory' },
    { to: '/warehouse/incoming-requests', label: 'Incoming requests' },
    { to: '/warehouse/dispatch', label: 'Dispatch orders' },
    { to: '/catalog/suppliers', label: 'Suppliers' },
  ],
};

export default function DashboardPage() {
  const { role, has } = usePermissions();
  const { getCategories, getProducts, getSuppliers } = useReferenceData();
  const webRole = normalizeWebRole(role);

  if (webRole === 'CASHIER') {
    return <Navigate to="/pos" replace />;
  }

  const config = ROLE_DASHBOARD[webRole];
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const cfg = ROLE_DASHBOARD[webRole];
    if (!cfg?.fetch || !has(cfg.permission)) {
      setLoading(false);
      setModuleData(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    cfg
      .fetch()
      .then((data) => {
        if (!cancelled) setModuleData(data);
      })
      .catch(() => {
        if (!cancelled) setModuleData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [webRole, has]);

  useEffect(() => {
    if (webRole !== 'ADMIN') return undefined;
    let cancelled = false;

    async function loadCounts() {
      const next = {};
      const tasks = [
        ['branches', has('BRANCH_LIST_ADMIN') ? fetchBranches() : Promise.resolve([])],
        ['users', has('USER_MANAGEMENT_LIST') ? fetchUsers() : Promise.resolve([])],
        ['products', getProducts()],
        ['categories', getCategories()],
        ['suppliers', has('SUPPLIER_MANAGEMENT') ? getSuppliers() : Promise.resolve([])],
        ['campaigns', has('PROMOTION_LIST') ? fetchCampaigns() : Promise.resolve([])],
      ];

      const results = await Promise.allSettled(tasks.map(([, fn]) => fn));
      tasks.forEach(([key], idx) => {
        const result = results[idx];
        next[key] =
          result.status === 'fulfilled' && Array.isArray(result.value)
            ? result.value.length
            : '—';
      });

      if (!cancelled) setCounts(next);
    }

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [webRole, has, getCategories, getProducts, getSuppliers]);

  const quickLinks = QUICK_LINKS[webRole] || [];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={config?.title || 'Overview'}
        description={`Role: ${ROLE_LABELS[webRole] || webRole || '—'}. ChainStore convenience chain management system.`}
        badge={
          moduleData?.status === 'placeholder' ? (
            <Badge tone="soon">API placeholder</Badge>
          ) : null
        }
      />

      {(webRole === 'ADMIN' || webRole === 'DIRECTOR') && (
        <SetupWorkflowBanner counts={webRole === 'ADMIN' ? counts : undefined} />
      )}

      {config ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {config.stats.map((s) => (
              <StatCard
                key={s.label}
                {...s}
                value={s.key && counts[s.key] != null ? counts[s.key] : s.value}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h2 className="text-base font-semibold text-[var(--admin-text)]">Module status</h2>
              <p className="mt-1 text-sm text-[var(--admin-muted)]">
                {loading
                  ? 'Loading data from backend...'
                  : moduleData?.message ||
                    'API connected. Detailed business logic will ship in upcoming sprints.'}
              </p>
              {moduleData && (
                <div className="mt-4 rounded-lg bg-[#f7f9fb] px-4 py-3 text-sm">
                  <p>
                    <span className="font-medium">Module:</span> {moduleData.module || '—'}
                  </p>
                  <p>
                    <span className="font-medium">Screen:</span> {moduleData.screen || '—'}
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold text-[var(--admin-text)]">Quick links</h2>
              <ul className="mt-3 space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
                    >
                      {link.label}
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <p className="text-sm text-[var(--admin-muted)]">
            This role does not have a dedicated web dashboard. Use the POS or mobile app for
            Cashier / Inventory staff roles.
          </p>
        </Card>
      )}
    </div>
  );
}
