import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Badge from '../../components/ui/Badge.jsx';
import {
  fetchBranchAttendance,
  fetchBranchRefunds,
  fetchReconciliationList,
} from '../../api/shiftSessions.js';
import useClientPage from '../../hooks/useClientPage.js';
import { formatDateTime } from '../../lib/datetime.js';

import InventoryCountsAuditTab from './components/InventoryCountsAuditTab.jsx';
import {
  COUNT_DISCREPANCY_OPTIONS,
} from '../../constants/inventoryStaff.js';

const TABS = [
  { id: 'discrepancies', label: 'Discrepancies' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'inventory-counts', label: 'Inventory counts' },
];

const DISCREPANCY_OPTIONS = [
  { value: 'with', label: 'With discrepancy (default)' },
  { value: 'without', label: 'No discrepancy' },
  { value: 'all', label: 'All' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_APPROVAL', label: 'Pending approval' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PUNCTUALITY_OPTIONS = [
  { value: '', label: 'All punctuality' },
  { value: 'early', label: 'Early' },
  { value: 'ontime', label: 'On time' },
  { value: 'late', label: 'Late' },
  { value: 'none', label: 'No check-in' },
];

const selectClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[var(--admin-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-brand)]/15';

const inputClass =
  'rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[var(--admin-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-brand)]/15';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

function differenceClass(value) {
  const n = Number(value ?? 0);
  if (n > 0) return 'text-emerald-600 font-semibold';
  if (n < 0) return 'text-red-600 font-semibold';
  return 'text-[var(--admin-text)] font-semibold';
}

function attendanceLabel(minutesLate) {
  if (minutesLate == null) return { text: 'No check-in', tone: 'danger', key: 'none' };
  const n = Number(minutesLate);
  if (n < 0) return { text: `Early ${Math.abs(n)} min`, tone: 'success', key: 'early' };
  if (n === 0) return { text: 'On time', tone: 'success', key: 'ontime' };
  return { text: `Late ${n} min`, tone: 'warning', key: 'late' };
}

function toIsoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

export default function BranchAuditPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'discrepancies';

  const [discrepancy, setDiscrepancy] = useState('with');
  const [status, setStatus] = useState('');
  const [attFrom, setAttFrom] = useState(() => daysAgoIso(7));
  const [attTo, setAttTo] = useState(() => toIsoDate());
  const [punctuality, setPunctuality] = useState('');
  const [countSearch, setCountSearch] = useState('');
  const [countDiscrepancy, setCountDiscrepancy] = useState('with');
  const [countFrom, setCountFrom] = useState(() => daysAgoIso(7));
  const [countTo, setCountTo] = useState(() => toIsoDate());
  const [discRows, setDiscRows] = useState([]);
  const [attRows, setAttRows] = useState([]);
  const [refundRows, setRefundRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const discPage = useClientPage(discRows);
  const filteredAttRows = useMemo(() => {
    if (!punctuality) return attRows;
    return attRows.filter((row) => attendanceLabel(row.minutesLate).key === punctuality);
  }, [attRows, punctuality]);
  const attPage = useClientPage(filteredAttRows);
  const refundPage = useClientPage(refundRows);

  const setTab = useCallback(
    (next) => {
      setSearchParams({ tab: next }, { replace: true });
    },
    [setSearchParams],
  );

  const loadDiscrepancies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReconciliationList({
        discrepancy,
        status: status || undefined,
      });
      setDiscRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load discrepancies');
      setDiscRows([]);
    } finally {
      setLoading(false);
    }
  }, [discrepancy, status]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBranchAttendance({
        from: attFrom || undefined,
        to: attTo || undefined,
      });
      setAttRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load attendance');
      setAttRows([]);
    } finally {
      setLoading(false);
    }
  }, [attFrom, attTo]);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBranchRefunds();
      setRefundRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load refunds');
      setRefundRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'discrepancies') loadDiscrepancies();
    else if (tab === 'attendance') loadAttendance();
    else if (tab === 'refunds') loadRefunds();
  }, [tab, loadDiscrepancies, loadAttendance, loadRefunds]);

  const discrepancyFilters = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={discrepancy}
          onChange={(e) => setDiscrepancy(e.target.value)}
        >
          {DISCREPANCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ),
    [discrepancy, status],
  );

  const attendanceFilters = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
          From
          <input
            type="date"
            className={inputClass}
            value={attFrom}
            max={attTo || undefined}
            onChange={(e) => setAttFrom(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
          To
          <input
            type="date"
            className={inputClass}
            value={attTo}
            min={attFrom || undefined}
            onChange={(e) => setAttTo(e.target.value)}
          />
        </label>
        <select
          className={selectClass}
          value={punctuality}
          onChange={(e) => setPunctuality(e.target.value)}
        >
          {PUNCTUALITY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ),
    [attFrom, attTo, punctuality],
  );

  const inventoryCountFilters = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          className={`${inputClass} w-52`}
          value={countSearch}
          onChange={(e) => setCountSearch(e.target.value)}
          placeholder="Session ID or counted by"
        />
        <select
          className={selectClass}
          value={countDiscrepancy}
          onChange={(e) => setCountDiscrepancy(e.target.value)}
        >
          {COUNT_DISCREPANCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
          From
          <input
            type="date"
            className={inputClass}
            value={countFrom}
            max={countTo || undefined}
            onChange={(e) => setCountFrom(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
          To
          <input
            type="date"
            className={inputClass}
            value={countTo}
            min={countFrom || undefined}
            onChange={(e) => setCountTo(e.target.value)}
          />
        </label>
      </div>
    ),
    [countSearch, countDiscrepancy, countFrom, countTo],
  );

  const headerActions =
    tab === 'discrepancies'
      ? discrepancyFilters
      : tab === 'attendance'
        ? attendanceFilters
        : tab === 'inventory-counts'
          ? inventoryCountFilters
          : null;

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Branch Audit" actions={headerActions} />

      <div className="flex flex-wrap gap-1 border-b border-[var(--admin-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'border-b-2 border-[var(--admin-brand)] text-[var(--admin-brand)]'
                : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card padding={false} className="overflow-hidden">
        {tab === 'inventory-counts' ? (
          <InventoryCountsAuditTab
            search={countSearch}
            discrepancy={countDiscrepancy}
            from={countFrom}
            to={countTo}
          />
        ) : loading ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">Loading…</p>
        ) : tab === 'discrepancies' ? (
          discRows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--admin-muted)]">No sessions match these filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full w-full text-left text-sm">
                  <thead className="bg-[var(--admin-brand)] text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Shift ID</th>
                      <th className="px-4 py-3 font-semibold">Cashier</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Expected</th>
                      <th className="px-4 py-3 font-semibold">Actual</th>
                      <th className="px-4 py-3 font-semibold">Difference</th>
                      <th className="px-4 py-3 font-semibold">Products</th>
                      <th className="px-4 py-3 font-semibold">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discPage.items.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => navigate(`/branch-manager/cash-reconciliation/${row.id}`)}
                        className="cursor-pointer border-b border-[var(--admin-border)] transition hover:bg-[var(--admin-brand)]/5"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--admin-brand)]">
                          {row.shiftId ?? row.id}
                        </td>
                        <td className="px-4 py-3">{row.employeeName ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone="default">{row.status}</Badge>
                        </td>
                        <td className="px-4 py-3">{formatMoney(row.expectedCash)}</td>
                        <td className="px-4 py-3">{formatMoney(row.actualCash)}</td>
                        <td className={`px-4 py-3 ${differenceClass(row.difference)}`}>
                          {formatMoney(row.difference)}
                        </td>
                        <td className="px-4 py-3">
                          {row.hasProductDiscrepancy ? (
                            <span className="font-semibold text-amber-700">
                              {row.productDiscrepancyCount ?? '—'} item(s)
                            </span>
                          ) : (
                            <span className="text-[var(--admin-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDateTime(row.closedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                {...discPage}
                onPageChange={discPage.setPage}
                onSizeChange={discPage.setSize}
                disabled={loading}
              />
            </>
          )
        ) : tab === 'attendance' ? (
          filteredAttRows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--admin-muted)]">No attendance records match these filters.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full w-full text-left text-sm">
                  <thead className="bg-[var(--admin-brand)] text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Staff</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Shift</th>
                      <th className="px-4 py-3 font-semibold">Check-in</th>
                      <th className="px-4 py-3 font-semibold">Open / Close</th>
                      <th className="px-4 py-3 font-semibold">Punctuality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attPage.items.map((row, idx) => {
                      const punctuality = attendanceLabel(row.minutesLate);
                      return (
                        <tr
                          key={`${row.shiftId}-${row.employeeId}-${idx}`}
                          className="border-b border-[var(--admin-border)]"
                        >
                          <td className="px-4 py-3 font-medium">{row.cashierName ?? row.employeeName ?? '—'}</td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">{row.role ?? '—'}</td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {formatDateTime(row.shiftStartTime ?? row.shiftStart)} →{' '}
                            {formatDateTime(row.shiftEndTime ?? row.shiftEnd)}
                          </td>
                          <td className="px-4 py-3">{formatDateTime(row.checkInAt) || '—'}</td>
                          <td className="px-4 py-3 text-[var(--admin-muted)]">
                            {formatDateTime(row.openedAt) || '—'} / {formatDateTime(row.closedAt) || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={punctuality.tone}>{punctuality.text}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                {...attPage}
                onPageChange={attPage.setPage}
                onSizeChange={attPage.setSize}
                disabled={loading}
              />
            </>
          )
        ) : tab === 'refunds' ? (
          refundRows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--admin-muted)]">No refunds recorded for this branch.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full w-full text-left text-sm">
                  <thead className="bg-[var(--admin-brand)] text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Cashier</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Time</th>
                      <th className="px-4 py-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundPage.items.map((row) => (
                      <tr key={row.refundId ?? row.id ?? row.invoiceCode} className="border-b border-[var(--admin-border)]">
                        <td className="px-4 py-3 font-medium text-[var(--admin-brand)]">
                          {row.invoiceCode ?? row.orderId ?? '—'}
                        </td>
                        <td className="px-4 py-3">{row.cashierName ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold">{formatMoney(row.amount ?? row.refundAmount)}</td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">
                          {formatDateTime(row.refundedAt ?? row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--admin-muted)]">{row.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                {...refundPage}
                onPageChange={refundPage.setPage}
                onSizeChange={refundPage.setSize}
                disabled={loading}
              />
            </>
          )
        ) : null}
      </Card>
    </div>
  );
}
