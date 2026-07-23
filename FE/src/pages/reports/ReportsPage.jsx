import { useCallback, useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatVnd } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import {
  fetchRevenue,
  fetchInvoices,
  fetchCashDiscrepancies,
  fetchPointTransactions,
} from '../../api/reports.js';

const inputClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'discrepancies', label: 'Cash discrepancies' },
  { key: 'points', label: 'Point history' },
];

const GROUP_BY = [
  { key: 'shift', label: 'By shift' },
  { key: 'employee', label: 'By employee' },
  { key: 'branch', label: 'By branch' },
];

const REVENUE_GROUP = {
  shift: { header: 'Shift', label: (r) => `Shift #${r.shiftId ?? '—'}`, key: (r) => r.shiftId },
  employee: {
    header: 'Employee',
    label: (r) => r.cashierName ?? r.cashierId ?? '—',
    key: (r) => r.cashierId,
  },
  branch: {
    header: 'Branch',
    label: (r) => r.branchName ?? r.branchId ?? '—',
    key: (r) => r.branchId,
  },
};

/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function invoiceStatusTone(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'REFUNDED') return 'danger';
  if (s === 'COMPLETED') return 'success';
  if (s === 'PENDING') return 'warning';
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

/** Shared table shell: header row, skeleton while loading, empty message otherwise. */
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

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() =>
    toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [to, setTo] = useState(() => toDateInput(today));
  const [activeTab, setActiveTab] = useState('revenue');
  const [groupBy, setGroupBy] = useState('shift');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let data = [];
      if (activeTab === 'revenue') data = await fetchRevenue({ groupBy, from, to });
      else if (activeTab === 'invoices') data = await fetchInvoices({ from, to });
      else if (activeTab === 'discrepancies') data = await fetchCashDiscrepancies({ from, to });
      else if (activeTab === 'points') data = await fetchPointTransactions({ from, to });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load report data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, groupBy, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function selectTab(tab) {
    if (tab === activeTab) return;
    setRows([]);
    setLoading(true);
    setError('');
    setActiveTab(tab);
  }

  function selectGroupBy(g) {
    if (g === groupBy) return;
    setRows([]);
    setLoading(true);
    setGroupBy(g);
  }

  const revenueTotals = useMemo(() => {
    if (activeTab !== 'revenue') return { orders: 0, revenue: 0 };
    return rows.reduce(
      (acc, r) => ({
        orders: acc.orders + Number(r.orderCount ?? 0),
        revenue: acc.revenue + Number(r.revenue ?? 0),
      }),
      { orders: 0, revenue: 0 },
    );
  }, [activeTab, rows]);

  const group = REVENUE_GROUP[groupBy];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Revenue, invoices, cash reconciliation and loyalty point activity across the reporting period."
      />

      <Card className="!p-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--admin-muted)]">From</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--admin-muted)]">To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
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

      {activeTab === 'revenue' && (
        <div className="flex flex-wrap gap-2">
          {GROUP_BY.map((g) => {
            const active = g.key === groupBy;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => selectGroupBy(g.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-[var(--admin-brand)] bg-[#0058be]/10 text-[var(--admin-brand)]'
                    : 'border-[var(--admin-border)] bg-white text-[var(--admin-muted)] hover:bg-[#f0f4f8]'
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'revenue' && (
        <TableCard
          loading={loading}
          rows={rows}
          emptyText="No revenue in the selected period."
          columns={[
            { key: 'group', label: group.header },
            { key: 'orders', label: 'Orders', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right' },
          ]}
          renderRow={(r, i) => (
            <tr
              key={group.key(r) ?? i}
              className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
            >
              <td className="px-4 py-3 font-medium text-[var(--admin-text)]">{group.label(r)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-[var(--admin-muted)]">
                {r.orderCount ?? 0}
              </td>
              <td className="px-4 py-3 text-right font-semibold">{formatVnd(r.revenue)}</td>
            </tr>
          )}
          footer={
            <tr className="border-t-2 border-[var(--admin-border)] bg-[#f7f9fb] font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{revenueTotals.orders}</td>
              <td className="px-4 py-3 text-right text-[var(--admin-brand)]">
                {formatVnd(revenueTotals.revenue)}
              </td>
            </tr>
          }
        />
      )}

      {activeTab === 'invoices' && (
        <TableCard
          loading={loading}
          rows={rows}
          emptyText="No invoices in the selected period."
          columns={[
            { key: 'code', label: 'Invoice code' },
            { key: 'time', label: 'Time' },
            { key: 'cashier', label: 'Cashier' },
            { key: 'total', label: 'Total', align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          renderRow={(r, i) => (
            <tr
              key={r.id ?? i}
              className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
            >
              <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0058be]">
                {r.invoiceCode ?? '—'}
              </td>
              <td className="px-4 py-3 text-[var(--admin-muted)]">{formatDateTime(r.createdAt)}</td>
              <td className="px-4 py-3">{r.cashierName ?? r.cashierId ?? '—'}</td>
              <td className="px-4 py-3 text-right font-semibold">{formatVnd(r.total)}</td>
              <td className="px-4 py-3">
                <Badge tone={invoiceStatusTone(r.status)}>{r.status ?? '—'}</Badge>
              </td>
            </tr>
          )}
        />
      )}

      {activeTab === 'discrepancies' && (
        <TableCard
          loading={loading}
          rows={rows}
          emptyText="No cash discrepancies in the selected period."
          columns={[
            { key: 'shift', label: 'Shift' },
            { key: 'employee', label: 'Employee' },
            { key: 'expected', label: 'Expected', align: 'right' },
            { key: 'actual', label: 'Actual', align: 'right' },
            { key: 'difference', label: 'Difference', align: 'right' },
            { key: 'reviewer', label: 'Reviewer' },
            { key: 'note', label: 'Note' },
            { key: 'closed', label: 'Closed at' },
          ]}
          renderRow={(r, i) => (
            <tr
              key={r.sessionId ?? i}
              className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
            >
              <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                Shift #{r.shiftId ?? '—'}
              </td>
              <td className="px-4 py-3">{r.employeeName ?? '—'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatVnd(r.expectedCash)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatVnd(r.actualCash)}</td>
              <td className="px-4 py-3 text-right">
                <DifferenceCell difference={r.difference} />
              </td>
              <td className="px-4 py-3 text-[var(--admin-muted)]">{r.reviewedByName ?? '—'}</td>
              <td className="max-w-[220px] px-4 py-3 text-[var(--admin-muted)]">
                {r.reviewNote || '—'}
              </td>
              <td className="px-4 py-3 text-[var(--admin-muted)]">{formatDateTime(r.closedAt)}</td>
            </tr>
          )}
        />
      )}

      {activeTab === 'points' && (
        <TableCard
          loading={loading}
          rows={rows}
          emptyText="No point activity in the selected period."
          columns={[
            { key: 'time', label: 'Time' },
            { key: 'customer', label: 'Customer' },
            { key: 'order', label: 'Order' },
            { key: 'points', label: 'Points', align: 'right' },
            { key: 'type', label: 'Type' },
          ]}
          renderRow={(r, i) => (
            <tr
              key={r.id ?? i}
              className="border-t border-[var(--admin-border)] hover:bg-[#f7f9fb]/80"
            >
              <td className="px-4 py-3 text-[var(--admin-muted)]">{formatDateTime(r.createdAt)}</td>
              <td className="px-4 py-3">{r.customerName ?? r.customerId ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--admin-muted)]">
                {r.orderId ?? '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <PointsCell points={r.points} />
              </td>
              <td className="px-4 py-3">
                <Badge tone="default">{r.type ?? '—'}</Badge>
              </td>
            </tr>
          )}
        />
      )}
    </div>
  );
}
