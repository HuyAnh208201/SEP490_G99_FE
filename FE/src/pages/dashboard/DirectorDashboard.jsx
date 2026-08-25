import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDirectorDashboard } from '../../api/dashboards.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import ReportPeriodFilters from '../../components/domain/ReportPeriodFilters.jsx';
import DashboardKpiGrid from '../../components/dashboard/DashboardKpiGrid.jsx';
import { formatVnd } from '../../lib/money.js';
import { rangeForPeriod, toDateInput } from '../../lib/reportPeriods.js';

function momTrend(momPercent) {
  if (momPercent == null || Number.isNaN(Number(momPercent))) return undefined;
  const value = Number(momPercent);
  const positive = value >= 0;
  return {
    positive,
    label: `${positive ? '+' : ''}${value.toFixed(1)}% vs prior period`,
  };
}

export default function DirectorDashboard() {
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
      const payload = await fetchDirectorDashboard(range);
      setData(payload);
    } catch (err) {
      setError(err?.message || 'Failed to load executive dashboard');
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
      key: 'revenue',
      label: 'Chain revenue',
      value: loading ? '…' : formatVnd(data?.totalRevenue),
      icon: 'chart',
      trend: momTrend(data?.momPercent),
    },
    {
      key: 'profit',
      label: 'Chain profit',
      value: loading ? '…' : formatVnd(data?.totalProfit),
      icon: 'cash',
      hint: loading
        ? undefined
        : `${Number(data?.profitMarginPercent ?? 0).toFixed(1)}% margin · cost ${formatVnd(data?.totalCogs)}`,
    },
    {
      key: 'best',
      label: 'Best branch',
      value: loading ? '…' : data?.bestBranch?.name || '—',
      icon: 'store',
      hint: data?.bestBranch
        ? `${formatVnd(data.bestBranch.revenue)} · profit ${formatVnd(data.bestBranch.profit)}`
        : 'No revenue in period',
    },
    {
      key: 'weak',
      label: 'Weakest branch',
      value: loading ? '…' : data?.weakestBranch?.name || '—',
      icon: 'store',
      hint: data?.weakestBranch
        ? `${formatVnd(data.weakestBranch.revenue)} · profit ${formatVnd(data.weakestBranch.profit)}`
        : undefined,
    },
    {
      key: 'promos',
      label: 'Active promotions',
      value: loading ? '…' : data?.activePromotions ?? '—',
      icon: 'tag',
      hint: `${data?.draftPromotions ?? 0} draft · ${data?.suspendedPromotions ?? 0} suspended`,
    },
    {
      key: 'exceptions',
      label: 'Open exceptions',
      value: loading ? '…' : data?.exceptionCount ?? '—',
      icon: 'request',
      hint: `${data?.cashDiscrepancyCount ?? 0} cash gaps · ${data?.pendingImportRequests ?? 0} imports`,
    },
    {
      key: 'estimate',
      label: '7-day estimate',
      value: loading ? '…' : formatVnd(data?.projectedRevenue7d),
      icon: 'plan',
    },
  ];

  return (
    <div className="w-full space-y-5">
      <PageHeader title="Executive overview" />

      <Card className="!p-4">
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

      <DashboardKpiGrid items={kpis} columnsClass="sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" />

      <div className="grid gap-4 lg:grid-cols-5 w-full">
        <Card className="lg:col-span-3 !p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Branch portfolio</h2>
            </div>
            <Link to="/reports" className="text-sm font-semibold text-[var(--admin-brand)] hover:underline">
              Revenue Dashboard →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="px-4 py-2">Branch</th>
                  <th className="px-4 py-2 text-right">Orders</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Profit</th>
                  <th className="px-4 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-[var(--admin-border)]">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                        </td>
                      </tr>
                    ))
                  : (data?.branchPortfolio || []).map((row) => (
                      <tr key={row.branchId} className="border-t border-[var(--admin-border)]">
                        <td className="px-4 py-2.5 font-medium">{row.branchName}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{row.orderCount}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatVnd(row.revenue)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatVnd(row.profit)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.shareOfChainPercent != null ? `${row.shareOfChainPercent}%` : '—'}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Promotions</h2>
            <Link to="/promotions" className="text-sm font-semibold text-[var(--admin-brand)] hover:underline">
              Manage →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {(data?.activeCampaigns || []).map((promo) => (
              <li
                key={promo.id}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--admin-text)]">{promo.name}</p>
                  <Badge tone="success">{promo.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {promo.scope || '—'} · {promo.branchCount || 0} branch(es)
                  {promo.endAt ? ` · ends ${String(promo.endAt).slice(0, 10)}` : ''}
                </p>
              </li>
            ))}
            {!loading && !(data?.activeCampaigns || []).length ? (
              <li className="text-sm text-[var(--admin-muted)]">No active campaigns.</li>
            ) : null}
          </ul>

          <div className="mt-4 rounded-lg bg-[#f7f9fb] px-3 py-3 text-sm">
            <p className="font-semibold text-[var(--admin-text)]">Exceptions</p>
            <p className="mt-1 text-[var(--admin-muted)]">
              {data?.cashDiscrepancyCount ?? 0} cash discrepancy session(s) ·{' '}
              {data?.pendingImportRequests ?? 0} pending / awaiting import(s)
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link to="/reports" className="font-semibold text-[var(--admin-brand)] hover:underline">
                Review cash gaps
              </Link>
              <Link to="/purchase-requests" className="font-semibold text-[var(--admin-brand)] hover:underline">
                Import pipeline
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
