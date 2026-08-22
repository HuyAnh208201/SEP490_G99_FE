import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { fetchPendingReconciliation } from '../../api/shiftSessions.js';
import useClientPage from '../../hooks/useClientPage.js';
import { formatDateTime } from '../../lib/datetime.js';

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

export default function CashReconciliationListPage() {
  const navigate = useNavigate();
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pageData = useClientPage(allRows);
  const { items: rows } = pageData;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPendingReconciliation();
      setAllRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load pending shifts');
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Discrepancy Review"
        description="Review cashier shift closings with cash or high-value product count differences (pending approval)."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card padding={false} className="overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">Loading…</p>
        ) : allRows.length === 0 ? (
          <p className="p-6 text-sm text-[var(--admin-muted)]">
            No shifts are waiting for discrepancy review.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--admin-brand)] text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Shift ID</th>
                  <th className="px-4 py-3 font-semibold">Cashier</th>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Expected cash</th>
                  <th className="px-4 py-3 font-semibold">Actual cash</th>
                  <th className="px-4 py-3 font-semibold">Difference</th>
                  <th className="px-4 py-3 font-semibold">Product issues</th>
                  <th className="px-4 py-3 font-semibold">Closed time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/branch-manager/cash-reconciliation/${row.id}`)}
                    className="cursor-pointer border-b border-[var(--admin-border)] transition hover:bg-[var(--admin-brand)]/5"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--admin-brand)]">
                      {row.shiftId ?? row.id}
                    </td>
                    <td className="px-4 py-3">{row.employeeName ?? '—'}</td>
                    <td className="px-4 py-3">{row.branchName ?? '—'}</td>
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
        )}
        {!loading && allRows.length > 0 && (
          <Pagination
            {...pageData}
            onPageChange={pageData.setPage}
            onSizeChange={pageData.setSize}
            disabled={loading}
          />
        )}
      </Card>
    </div>
  );
}
