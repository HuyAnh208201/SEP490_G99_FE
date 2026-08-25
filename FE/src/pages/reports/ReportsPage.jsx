import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import ReportPeriodFilters from '../../components/domain/ReportPeriodFilters.jsx';
import { formatVnd } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import { rangeForPeriod } from '../../lib/reportPeriods.js';
import {
  fetchInvoicesPage,
  fetchCashDiscrepanciesPage,
  fetchPointTransactionsPage,
  fetchReportSummary,
  fetchReportTrend,
  fetchTopProducts,
  fetchRevenue,
} from '../../api/reports.js';
import { fetchBranches } from '../../api/branches.js';
import Pagination from '../../components/ui/Pagination.jsx';
import useServerPage from '../../hooks/useServerPage.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { normalizeWebRole } from '../../constants/userRoles.js';

const inputClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'discrepancies', label: 'Cash discrepancies' },
  { key: 'points', label: 'Point history' },
];

const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const POINT_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'EARN', label: 'Earn' },
  { value: 'REDEEM', label: 'Redeem' },
];

const CASH_DIFF_OPTIONS = [
  { value: '', label: 'All differences' },
  { value: 'over', label: 'Over' },
  { value: 'short', label: 'Short' },
  { value: 'balanced', label: 'Balanced' },
];

function invoiceStatusTone(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REFUNDED' || s === 'CANCELLED') return 'danger';
  if (s === 'COMPLETED') return 'success';
  return 'default';
}

function DifferenceCell({ difference }) {
  const diff = Number(difference ?? 0);
  if (diff > 0) {
    return <span className="font-semibold text-emerald-600">+{formatVnd(diff)} (over)</span>;
  }
  if (diff < 0) {
    return <span className="font-semibold text-red-600">−{formatVnd(Math.abs(diff))} (short)</span>;
  }
  return <span className="font-semibold text-[var(--admin-muted)]">{formatVnd(0)} (balanced)</span>;
}

function PointsCell({ points }) {
  const value = Number(points ?? 0);
  if (value > 0) return <span className="font-semibold text-emerald-600">+{value}</span>;
  if (value < 0) return <span className="font-semibold text-red-600">−{Math.abs(value)}</span>;
  return <span className="font-semibold text-[var(--admin-muted)]">0</span>;
}

function TableCard({ columns, loading, rows, renderRow, emptyText, footer }) {
  const colCount = columns.length;
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-[var(--admin-border)]">
                    <td colSpan={colCount} className="px-4 py-4">
                      <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                    </td>
                  </tr>
                ))
              : rows.map(renderRow)}
            {!loading && rows.length > 0 && footer}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-[var(--admin-muted)]">{emptyText}</p>
        )}
      </div>
    </Card>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <Card className="!p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums text-[var(--admin-text)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--admin-muted)]">{hint}</p> : null}
    </Card>
  );
}

function mergeCompareTrends(rowsA, rowsB) {
  const byDate = new Map();
  for (const p of rowsA || []) {
    byDate.set(p.date, {
      date: p.date,
      label: String(p.date).slice(5),
      revenueA: Number(p.revenue ?? 0),
      profitA: Number(p.profit ?? 0),
      revenueB: 0,
      profitB: 0,
    });
  }
  for (const p of rowsB || []) {
    const existing = byDate.get(p.date) || {
      date: p.date,
      label: String(p.date).slice(5),
      revenueA: 0,
      profitA: 0,
      revenueB: 0,
      profitB: 0,
    };
    existing.revenueB = Number(p.revenue ?? 0);
    existing.profitB = Number(p.profit ?? 0);
    byDate.set(p.date, existing);
  }
  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function RevenueDashboard({
  isChainScope,
  from,
  to,
  period,
  anchorDate,
  onPeriodChange,
  onAnchorChange,
  onFromChange,
  onToChange,
  branchId,
  onBranchChange,
  compareBranchId,
  onCompareBranchChange,
  branches,
  applied,
  onApply,
}) {
  const [summary, setSummary] = useState(null);
  const [compareSummary, setCompareSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [byBranch, setByBranch] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isComparing = Boolean(isChainScope && applied.branchId && applied.compareBranchId);

  const branchName = useCallback(
    (id) => branches.find((b) => b.id === id)?.name || `Branch #${id}`,
    [branches],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const baseParams = {
          from: applied.from,
          to: applied.to,
        };

        if (isComparing) {
          const paramsA = { ...baseParams, branchId: applied.branchId };
          const paramsB = { ...baseParams, branchId: applied.compareBranchId };
          const [sumA, sumB, trendA, trendB, products] = await Promise.all([
            fetchReportSummary(paramsA),
            fetchReportSummary(paramsB),
            fetchReportTrend(paramsA),
            fetchReportTrend(paramsB),
            fetchTopProducts({ ...paramsA, limit: 5 }),
          ]);
          if (cancelled) return;
          setSummary(sumA);
          setCompareSummary(sumB);
          setTrend(mergeCompareTrends(trendA, trendB));
          setTopProducts(products || []);
          setByBranch([
            {
              name: branchName(applied.branchId),
              revenue: Number(sumA?.totalRevenue ?? 0),
              profit: Number(sumA?.totalProfit ?? 0),
            },
            {
              name: branchName(applied.compareBranchId),
              revenue: Number(sumB?.totalRevenue ?? 0),
              profit: Number(sumB?.totalProfit ?? 0),
            },
          ]);
          return;
        }

        setCompareSummary(null);
        const params = {
          ...baseParams,
          branchId: applied.branchId || undefined,
        };
        const [sum, trendRows, products, branchRevenue] = await Promise.all([
          fetchReportSummary(params),
          fetchReportTrend(params),
          fetchTopProducts({ ...params, limit: 5 }),
          isChainScope && !applied.branchId
            ? fetchRevenue({ groupBy: 'branch', from: applied.from, to: applied.to })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setTrend(
          (trendRows || []).map((p) => ({
            date: p.date,
            label: String(p.date).slice(5),
            revenue: Number(p.revenue ?? 0),
            profit: Number(p.profit ?? 0),
            orderCount: Number(p.orderCount ?? 0),
          })),
        );
        setTopProducts(products || []);
        const branchRows = branchRevenue?.rows || branchRevenue || [];
        if (Array.isArray(branchRows) && branchRows.length) {
          const nameById = new Map((branches || []).map((b) => [b.id, b.name]));
          setByBranch(
            [...branchRows]
              .map((r) => ({
                id: r.id,
                name: r.name || nameById.get(r.id) || `Branch #${r.id}`,
                revenue: Number(r.revenue ?? 0),
                profit: Number(r.profit ?? 0),
              }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5),
          );
        } else {
          setByBranch([]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load revenue dashboard.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [
    applied.key,
    applied.from,
    applied.to,
    applied.branchId,
    applied.compareBranchId,
    isChainScope,
    isComparing,
    branches,
    branchName,
  ]);

  const periodLabel = `${applied.from || '…'} → ${applied.to || '…'}`;

  const selectedBranchName = applied.branchId
    ? branchName(applied.branchId)
    : 'All branches';

  const compareBranchName = applied.compareBranchId
    ? branchName(applied.compareBranchId)
    : null;

  const scopeLabel = isChainScope
    ? isComparing
      ? `Scope · ${selectedBranchName} vs ${compareBranchName}`
      : `Scope · ${selectedBranchName}`
    : 'Scope · Your branch';

  const showBranchBarChart = isChainScope && (isComparing || !applied.branchId);
  const branchAName = isComparing ? branchName(applied.branchId) : '';
  const branchBName = isComparing ? branchName(applied.compareBranchId) : '';

  const compareBranchSelect =
    isChainScope && onCompareBranchChange ? (
      <label className="flex min-w-[180px] flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--admin-muted)]">Compare branch</span>
        <select
          value={compareBranchId || ''}
          onChange={(e) =>
            onCompareBranchChange(e.target.value ? Number(e.target.value) : '')
          }
          className={inputClass}
          disabled={!branchId}
        >
          <option value="">{branchId ? 'None' : 'Select a branch first'}</option>
          {(branches || [])
            .filter((b) => b.id !== branchId)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </select>
      </label>
    ) : null;

  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <ReportPeriodFilters
          period={period}
          anchorDate={anchorDate}
          from={from}
          to={to}
          onPeriodChange={onPeriodChange}
          onAnchorChange={onAnchorChange}
          onFromChange={onFromChange}
          onToChange={onToChange}
          onApply={onApply}
          branchId={branchId}
          onBranchChange={onBranchChange}
          branches={branches}
          isChainScope={isChainScope}
          extraFilters={compareBranchSelect}
          applyLabel="Apply filters"
        />
        <p className="mt-2 text-xs text-[var(--admin-muted)]">{scopeLabel}</p>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total revenue"
          value={loading ? '…' : formatVnd(summary?.totalRevenue)}
          hint={periodLabel}
        />
        <KpiCard
          label="Total cost (COGS)"
          value={loading ? '…' : formatVnd(summary?.totalCogs)}
        />
        <KpiCard
          label="Profit"
          value={loading ? '…' : formatVnd(summary?.totalProfit)}
          hint={
            loading
              ? undefined
              : `${Number(summary?.profitMarginPercent ?? 0).toFixed(1)}% margin`
          }
        />
        <KpiCard
          label="Margin"
          value={loading ? '…' : `${Number(summary?.profitMarginPercent ?? 0).toFixed(1)}%`}
        />
        <KpiCard
          label="Total transactions"
          value={loading ? '…' : Number(summary?.transactionCount ?? 0).toLocaleString()}
        />
        {isChainScope ? (
          isComparing ? (
            <KpiCard
              label={`Compare · ${compareBranchName}`}
              value={loading ? '…' : formatVnd(compareSummary?.totalRevenue)}
              hint={
                loading
                  ? undefined
                  : `Profit ${formatVnd(compareSummary?.totalProfit)} · ${Number(compareSummary?.profitMarginPercent ?? 0).toFixed(1)}% margin`
              }
            />
          ) : (
            <KpiCard
              label="Top branch"
              value={loading ? '…' : summary?.topBranch?.name || '—'}
              hint={
                summary?.topBranch
                  ? `${formatVnd(summary.topBranch.revenue)} · profit ${formatVnd(summary.topBranch.profit)}`
                  : 'No revenue yet'
              }
            />
          )
        ) : (
          <KpiCard
            label="Avg. transaction value"
            value={loading ? '…' : formatVnd(summary?.avgTransactionValue)}
          />
        )}
      </div>

      <div className={`grid gap-3 ${showBranchBarChart ? 'xl:grid-cols-3' : 'xl:grid-cols-1'}`}>
        <Card className={`${showBranchBarChart ? 'xl:col-span-2' : ''} !p-4`}>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--admin-text)]">Revenue and profit trend</h3>
            <span className="text-xs text-[var(--admin-muted)]">{periodLabel}</span>
          </div>
          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">
                Loading chart…
              </div>
            ) : trend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">
                No revenue in the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`
                    }
                  />
                  <Tooltip formatter={(v, name) => [formatVnd(v), name]} labelFormatter={(l) => `Day ${l}`} />
                  <Legend />
                  {isComparing ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="revenueA"
                        name={`Revenue (${branchAName})`}
                        stroke="#0058be"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenueB"
                        name={`Revenue (${branchBName})`}
                        stroke="#60a5fa"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="profitA"
                        name={`Profit (${branchAName})`}
                        stroke="#0f9d58"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="profitB"
                        name={`Profit (${branchBName})`}
                        stroke="#6ee7b7"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={false}
                      />
                    </>
                  ) : (
                    <>
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#0058be"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Profit"
                        stroke="#0f9d58"
                        strokeWidth={2}
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {showBranchBarChart && (
          <Card className="!p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--admin-text)]">
                {isComparing ? 'Branch comparison' : 'Revenue by branch'}
              </h3>
              <span className="text-xs text-[var(--admin-muted)]">
                {isComparing ? 'Side by side' : 'Top 5'}
              </span>
            </div>
            <div className="h-64 w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">
                  Loading chart…
                </div>
              ) : byBranch.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--admin-muted)]">
                  No branch revenue yet.
                </div>
              ) : isComparing ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byBranch} margin={{ left: 8, right: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`
                      }
                    />
                    <Tooltip formatter={(v, name) => [formatVnd(v), name]} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#0058be" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#0f9d58" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byBranch} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`
                      }
                    />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, name) => [formatVnd(v), name]} />
                    <Bar dataKey="revenue" name="Revenue" fill="#0058be" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#0f9d58" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        )}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex items-baseline justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-3">
          <h3 className="text-sm font-bold text-[var(--admin-text)]">Best-selling products</h3>
          <span className="text-xs text-[var(--admin-muted)]">Top 5 · {periodLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Product name</th>
                <th className="px-4 py-3 text-right">Qty sold</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-t border-[var(--admin-border)]">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="h-4 animate-pulse rounded bg-[#eceef0]" />
                      </td>
                    </tr>
                  ))
                : topProducts.map((p, i) => (
                    <tr key={p.productId ?? i} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-3 text-[var(--admin-muted)]">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{p.productName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {Number(p.qtySold ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatVnd(p.revenue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatVnd(p.cogs)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatVnd(p.profit)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && topProducts.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-[var(--admin-muted)]">
              No product sales in the selected period.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const role = normalizeWebRole(user?.role);
  const isChainScope = role === 'DIRECTOR' || role === 'ADMIN';
  const isBm = role === 'BRANCH_MANAGER';

  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState('week');
  const [anchorDate, setAnchorDate] = useState(today);
  const initialRange = useMemo(() => rangeForPeriod('week', today), [today]);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [branchId, setBranchId] = useState('');
  const [compareBranchId, setCompareBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [pointType, setPointType] = useState('');
  const [cashDiff, setCashDiff] = useState('');
  const [applied, setApplied] = useState({
    from: initialRange.from,
    to: initialRange.to,
    branchId: '',
    compareBranchId: '',
    invoiceStatus: '',
    pointType: '',
    cashDiff: '',
    key: 0,
  });

  const [activeTab, setActiveTab] = useState('revenue');

  useEffect(() => {
    if (!isChainScope) return;
    let cancelled = false;
    fetchBranches()
      .then((list) => {
        if (!cancelled) setBranches(Array.isArray(list) ? list : list?.items || []);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isChainScope]);

  function handleBranchChange(nextId) {
    setBranchId(nextId);
    if (!nextId || nextId === compareBranchId) {
      setCompareBranchId('');
    }
  }

  function commitApplied(nextFrom = from, nextTo = to) {
    setApplied((prev) => ({
      from: nextFrom,
      to: nextTo,
      branchId,
      compareBranchId: branchId && compareBranchId ? compareBranchId : '',
      invoiceStatus,
      pointType,
      cashDiff,
      key: prev.key + 1,
    }));
  }

  function handlePeriodChange(next) {
    setPeriod(next);
    if (next === 'week' || next === 'month') {
      const range = rangeForPeriod(next, anchorDate);
      if (range) {
        setFrom(range.from);
        setTo(range.to);
        setApplied((prev) => ({
          ...prev,
          from: range.from,
          to: range.to,
          branchId,
          compareBranchId: branchId && compareBranchId ? compareBranchId : '',
          invoiceStatus,
          pointType,
          cashDiff,
          key: prev.key + 1,
        }));
      }
    }
  }

  const fetchReportPage = useCallback(
    (params) => {
      const scoped = {
        ...params,
        from: applied.from,
        to: applied.to,
        branchId: isChainScope && applied.branchId ? applied.branchId : undefined,
      };
      if (activeTab === 'invoices') {
        return fetchInvoicesPage({
          ...scoped,
          search: applied.invoiceStatus || undefined,
        });
      }
      if (activeTab === 'discrepancies') return fetchCashDiscrepanciesPage(scoped);
      return fetchPointTransactionsPage({
        ...scoped,
        search: applied.pointType || undefined,
      });
    },
    [activeTab, applied, isChainScope],
  );

  const pageData = useServerPage(fetchReportPage, {
    from: applied.from,
    to: applied.to,
    search:
      activeTab === 'invoices'
        ? applied.invoiceStatus || undefined
        : activeTab === 'points'
          ? applied.pointType || undefined
          : undefined,
    branchId: applied.branchId || undefined,
    tab: activeTab,
    cashDiff: applied.cashDiff || undefined,
  });
  const { items: rawRows, loading, error } = pageData;
  const rows =
    activeTab === 'discrepancies' && applied.cashDiff
      ? rawRows.filter((r) => {
          const diff = Number(r.difference ?? 0);
          if (applied.cashDiff === 'over') return diff > 0;
          if (applied.cashDiff === 'short') return diff < 0;
          if (applied.cashDiff === 'balanced') return diff === 0;
          return true;
        })
      : rawRows;

  const title = isBm ? 'Branch Performance' : 'Revenue Dashboard';

  const tabExtraFilters =
    activeTab === 'invoices' ? (
      <label className="flex min-w-[160px] flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--admin-muted)]">Status</span>
        <select
          value={invoiceStatus}
          onChange={(e) => setInvoiceStatus(e.target.value)}
          className={inputClass}
        >
          {INVOICE_STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    ) : activeTab === 'points' ? (
      <label className="flex min-w-[160px] flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--admin-muted)]">Type</span>
        <select
          value={pointType}
          onChange={(e) => setPointType(e.target.value)}
          className={inputClass}
        >
          {POINT_TYPE_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    ) : activeTab === 'discrepancies' ? (
      <label className="flex min-w-[160px] flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--admin-muted)]">Difference</span>
        <select
          value={cashDiff}
          onChange={(e) => setCashDiff(e.target.value)}
          className={inputClass}
        >
          {CASH_DIFF_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <div className="w-full space-y-6">
      <PageHeader title={title} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-[var(--admin-brand)] bg-[var(--admin-brand)] text-white'
                  : 'border-[var(--admin-border)] bg-white text-[var(--admin-muted)] hover:bg-[#f0f4f8]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'revenue' ? (
        <RevenueDashboard
          isChainScope={isChainScope}
          from={from}
          to={to}
          period={period}
          anchorDate={anchorDate}
          onPeriodChange={handlePeriodChange}
          onAnchorChange={setAnchorDate}
          onFromChange={setFrom}
          onToChange={setTo}
          branchId={branchId}
          onBranchChange={handleBranchChange}
          compareBranchId={compareBranchId}
          onCompareBranchChange={setCompareBranchId}
          branches={branches}
          applied={applied}
          onApply={(nextFrom, nextTo) => {
            if (nextFrom != null) setFrom(nextFrom);
            if (nextTo != null) setTo(nextTo);
            commitApplied(nextFrom ?? from, nextTo ?? to);
          }}
        />
      ) : (
        <>
          <Card className="!p-4">
            <ReportPeriodFilters
              period={period}
              anchorDate={anchorDate}
              from={from}
              to={to}
              onPeriodChange={handlePeriodChange}
              onAnchorChange={setAnchorDate}
              onFromChange={setFrom}
              onToChange={setTo}
              onApply={(nextFrom, nextTo) => {
                if (nextFrom != null) setFrom(nextFrom);
                if (nextTo != null) setTo(nextTo);
                commitApplied(nextFrom ?? from, nextTo ?? to);
              }}
              branchId={branchId}
              onBranchChange={handleBranchChange}
              branches={branches}
              isChainScope={isChainScope}
              extraFilters={tabExtraFilters}
              applyLabel="Apply filters"
            />
          </Card>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'invoices' && (
            <>
              <TableCard
                loading={loading}
                rows={rows}
                emptyText="No invoices in the selected period."
                columns={[
                  { key: 'code', label: 'Invoice' },
                  { key: 'status', label: 'Status' },
                  { key: 'total', label: 'Total', align: 'right' },
                  { key: 'time', label: 'Time', align: 'right' },
                ]}
                renderRow={(r) => (
                  <tr key={r.id} className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80">
                    <td className="px-4 py-3 font-medium">{r.invoiceCode || `#${r.id}`}</td>
                    <td className="px-4 py-3">
                      <Badge tone={invoiceStatusTone(r.status)}>{r.status || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatVnd(r.total)}</td>
                    <td className="px-4 py-3 text-right text-[var(--admin-muted)]">
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                )}
              />
              <Pagination
                page={pageData.page}
                size={pageData.size}
                totalRecords={pageData.totalRecords}
                totalPages={pageData.totalPages}
                onPageChange={pageData.setPage}
                onSizeChange={pageData.setSize}
                disabled={loading}
              />
            </>
          )}

          {activeTab === 'discrepancies' && (
            <>
              <TableCard
                loading={loading}
                rows={rows}
                emptyText="No cash discrepancies in the selected period."
                columns={[
                  { key: 'cashier', label: 'Cashier' },
                  { key: 'expected', label: 'Expected', align: 'right' },
                  { key: 'actual', label: 'Actual', align: 'right' },
                  { key: 'diff', label: 'Difference', align: 'right' },
                  { key: 'closed', label: 'Closed', align: 'right' },
                ]}
                renderRow={(r, i) => (
                  <tr key={r.sessionId ?? i} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-3 font-medium">{r.employeeName || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatVnd(r.expectedCash)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatVnd(r.actualCash)}</td>
                    <td className="px-4 py-3 text-right">
                      <DifferenceCell difference={r.difference} />
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--admin-muted)]">
                      {formatDateTime(r.closedAt)}
                    </td>
                  </tr>
                )}
              />
              <Pagination
                page={pageData.page}
                size={pageData.size}
                totalRecords={pageData.totalRecords}
                totalPages={pageData.totalPages}
                onPageChange={pageData.setPage}
                onSizeChange={pageData.setSize}
                disabled={loading}
              />
            </>
          )}

          {activeTab === 'points' && (
            <>
              <TableCard
                loading={loading}
                rows={rows}
                emptyText="No point transactions in the selected period."
                columns={[
                  { key: 'customer', label: 'Customer' },
                  { key: 'type', label: 'Type' },
                  { key: 'points', label: 'Points', align: 'right' },
                  { key: 'order', label: 'Order' },
                  { key: 'time', label: 'Time', align: 'right' },
                ]}
                renderRow={(r) => (
                  <tr key={r.id} className="border-t border-[var(--admin-border)]">
                    <td className="px-4 py-3 font-medium">
                      {r.customerName || (r.customerId != null ? `#${r.customerId}` : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={String(r.type).toUpperCase() === 'EARN' ? 'success' : 'warning'}>
                        {r.type || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PointsCell points={r.points} />
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-muted)]">
                      {r.orderId != null ? `#${r.orderId}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--admin-muted)]">
                      {formatDateTime(r.createdAt)}
                    </td>
                  </tr>
                )}
              />
              <Pagination
                page={pageData.page}
                size={pageData.size}
                totalRecords={pageData.totalRecords}
                totalPages={pageData.totalPages}
                onPageChange={pageData.setPage}
                onSizeChange={pageData.setSize}
                disabled={loading}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
