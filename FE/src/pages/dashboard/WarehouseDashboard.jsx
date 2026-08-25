import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchWarehouseDashboard } from '../../api/dashboards.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import DashboardKpiGrid from '../../components/dashboard/DashboardKpiGrid.jsx';
import DashboardQuickLinks from '../../components/dashboard/DashboardQuickLinks.jsx';
import { formatVnd } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';

const SHORTCUTS = [
  { to: '/warehouse/incoming-requests', label: 'Incoming requests' },
  { to: '/warehouse/dispatch-planning', label: 'Dispatch planning' },
  { to: '/warehouse/dispatch', label: 'Dispatch orders' },
  { to: '/warehouse/purchase-orders', label: 'Supplier receipts' },
  { to: '/catalog/products', label: 'Central stock' },
  { to: '/catalog/suppliers', label: 'Suppliers' },
];

function statusLabel(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WarehouseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 7));

  const [year, month] = anchor.split('-').map(Number);
  const startMonth = period === 'quarter' ? Math.floor((month - 1) / 3) * 3 : month - 1;
  const span = period === 'quarter' ? 3 : 1;
  const periodRange = {
    from: new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, startMonth + span, 0)).toISOString().slice(0, 10),
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchWarehouseDashboard(periodRange)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load warehouse dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, anchor]);

  const kpis = [
    {
      key: 'sku',
      label: 'SKUs tracked',
      value: loading ? '…' : data?.skuCount ?? '—',
      icon: 'package',
      hint: `${loading ? '…' : data?.totalUnits ?? 0} total units`,
    },
    {
      key: 'low',
      label: 'Low stock',
      value: loading ? '…' : data?.lowStockCount ?? '—',
      icon: 'boxes',
    },
    {
      key: 'pending',
      label: 'Pending requests',
      value: loading ? '…' : data?.pendingRequests ?? '—',
      icon: 'inbox',
      hint: `${data?.awaitingStockRequests ?? 0} awaiting stock`,
    },
    {
      key: 'dispatch',
      label: 'Active dispatches',
      value: loading
        ? '…'
        : (data?.preparingDispatches || 0) +
          (data?.deliveringDispatches || 0) +
          (data?.redeliveryDispatches || 0),
      icon: 'dispatch',
      hint: `${data?.preparingDispatches ?? 0} preparing · ${data?.deliveringDispatches ?? 0} delivering`,
    },
    {
      key: 'po',
      label: 'Supplier receipts',
      value: loading ? '…' : data?.supplierReceipts ?? '—',
      icon: 'truck',
      hint: loading ? '…' : formatVnd(data?.supplierReceiptValue || 0),
    },
  ];

  const prChart = (data?.prStatusBreakdown || []).map((row) => ({
    name: statusLabel(row.status),
    count: Number(row.count || 0),
  }));

  const dispatchChart = (data?.dispatchPipeline || []).map((row) => ({
    name: statusLabel(row.status),
    count: Number(row.count || 0),
  }));

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Central warehouse"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {data?.generatedAt ? (
              <span className="text-sm font-medium text-[var(--admin-muted)]">
                Updated {formatDateTime(data.generatedAt)}
              </span>
            ) : null}
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm" aria-label="Report period">
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
            </select>
            <input type="month" value={anchor} onChange={(e) => setAnchor(e.target.value)} className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm" aria-label="Report month" />
          </div>
        )}
      />

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <DashboardKpiGrid items={kpis} columnsClass="sm:grid-cols-2 xl:grid-cols-5" />

      <div className="grid gap-4 lg:grid-cols-2 w-full">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">Import request pipeline</h2>
          <div className="h-52 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0058be" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">Dispatch pipeline</h2>
          <div className="h-52 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dispatchChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Low stock items</h2>
          </div>
          <Link to="/catalog/products" className="text-sm font-semibold text-[var(--admin-brand)] hover:underline">
            View inventory →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Reorder</th>
              </tr>
            </thead>
            <tbody>
              {(data?.lowStockItems || []).map((row) => (
                <tr key={row.productId} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-2.5 tabular-nums text-[var(--admin-muted)]">{row.productCode || '—'}</td>
                  <td className="px-4 py-2.5 font-medium">{row.productName || row.productCode || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-700">{row.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.reorderPoint}</td>
                </tr>
              ))}
              {!loading && !(data?.lowStockItems || []).length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                    No low-stock SKUs.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <DashboardQuickLinks links={SHORTCUTS} title="Warehouse tools" />
    </div>
  );
}
