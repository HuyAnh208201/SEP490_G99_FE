import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchBranchManagerDashboard } from '../../api/dashboards.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import ReportPeriodFilters from '../../components/domain/ReportPeriodFilters.jsx';
import DashboardKpiGrid from '../../components/dashboard/DashboardKpiGrid.jsx';
import { formatVnd } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import { rangeForPeriod, toDateInput } from '../../lib/reportPeriods.js';

function ActionLink({ to, label, count, hint }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] px-3 py-3 transition hover:border-[var(--admin-brand)] hover:bg-[#0058be]/5"
    >
      <div>
        <p className="text-sm font-semibold text-[var(--admin-text)]">{label}</p>
        {hint ? <p className="text-xs text-[var(--admin-muted)]">{hint}</p> : null}
      </div>
      <span className="text-lg font-bold tabular-nums text-[var(--admin-brand)]">{count}</span>
    </Link>
  );
}

export default function BranchManagerDashboard() {
  const initial = rangeForPeriod('month', new Date()) || {
    from: toDateInput(new Date()),
    to: toDateInput(new Date()),
  };
  const [period, setPeriod] = useState('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [applied, setApplied] = useState({ from: initial.from, to: initial.to });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (range) => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchBranchManagerDashboard(range));
    } catch (err) {
      setError(err?.message || 'Failed to load branch dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied);
  }, [applied, load]);

  const kpis = [
    {
      key: 'today',
      label: 'Today revenue',
      value: loading ? '…' : formatVnd(data?.todayRevenue),
      icon: 'cash',
      hint: loading
        ? undefined
        : `${data?.todayTransactions ?? 0} transactions · profit ${formatVnd(data?.todayProfit)}`,
    },
    {
      key: 'period',
      label: 'Period revenue',
      value: loading ? '…' : formatVnd(data?.periodRevenue),
      icon: 'chart',
      hint: loading ? undefined : `${data?.periodTransactions ?? 0} transactions`,
      trend:
        data?.momPercent == null
          ? undefined
          : {
              positive: Number(data.momPercent) >= 0,
              label: `${Number(data.momPercent) >= 0 ? '+' : ''}${Number(data.momPercent).toFixed(1)}% vs prior`,
            },
    },
    {
      key: 'profit',
      label: 'Period profit',
      value: loading ? '…' : formatVnd(data?.periodProfit),
      icon: 'cash',
      hint: loading
        ? undefined
        : `${Number(data?.profitMarginPercent ?? 0).toFixed(1)}% margin · cost ${formatVnd(data?.periodCogs)}`,
    },
    {
      key: 'atv',
      label: 'Avg transaction',
      value: loading ? '…' : formatVnd(data?.avgTransactionValue),
      icon: 'cash',
    },
  ];

  const trendData = (data?.trend || []).map((p) => ({
    date: String(p.date || '').slice(5),
    revenue: Number(p.revenue || 0),
    profit: Number(p.profit || 0),
  }));

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={data?.branchName ? `${data.branchName} operations` : 'Branch operations'}
        actions={
          data?.generatedAt ? (
            <span className="text-sm font-medium text-[var(--admin-muted)]">
              Updated {formatDateTime(data.generatedAt)}
            </span>
          ) : null
        }
      />

      <Card className="!p-3">
        <ReportPeriodFilters
          period={period}
          anchorDate={anchorDate}
          from={from}
          to={to}
          onPeriodChange={setPeriod}
          onAnchorChange={setAnchorDate}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={(nextFrom, nextTo) => setApplied({ from: nextFrom, to: nextTo })}
          isChainScope={false}
        />
      </Card>

      {error ? <p className="text-sm text-amber-700">{error}</p> : null}

      <DashboardKpiGrid items={kpis} />

      <div className="grid w-full gap-3 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <Card className="!p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Revenue trend</h2>
              <Link to="/reports" className="text-sm font-semibold text-[var(--admin-brand)] hover:underline">
                Full reports →
              </Link>
            </div>
            <div className="h-52 w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">
                  Loading…
                </div>
              ) : trendData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={56} />
                    <Tooltip formatter={(v, name) => [formatVnd(v), name]} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0058be" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#0f9d58" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">
                  No sales in this period.
                </div>
              )}
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-[var(--admin-border)] px-4 py-2.5">
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Top products</h2>
            </div>
            <table className="min-w-full w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topProducts || []).map((p) => (
                  <tr key={p.productId} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-2">{p.productName || p.productCode || '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{p.qtySold}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatVnd(p.revenue)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatVnd(p.profit)}</td>
                  </tr>
                ))}
                {!loading && !(data?.topProducts || []).length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--admin-muted)]">
                      No product sales yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>

        <Card className="!p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--admin-text)]">Action queue</h2>
          <div className="mt-3 space-y-2">
            <ActionLink
              to="/purchase-requests"
              label="Open import requests"
              count={loading ? '…' : data?.pendingImports ?? 0}
            />
            <ActionLink
              to="/branch-manager/audit?tab=discrepancies"
              label="Cash reconciliations"
              count={loading ? '…' : data?.pendingReconciliations ?? 0}
            />
            <ActionLink
              to="/branch-manager/audit?tab=attendance"
              label="Attendance review"
              count={loading ? '…' : '→'}
            />
            <ActionLink
              to="/catalog/products"
              label="Low stock SKUs"
              count={loading ? '…' : data?.lowStockSkus ?? 0}
            />
            <ActionLink
              to="/branch-manager/shifts"
              label="Published shifts"
              count={loading ? '…' : data?.publishedShifts ?? 0}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
