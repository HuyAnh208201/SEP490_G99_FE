import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import {
  decideReconciliation,
  differenceStatusLabel,
  fetchReconciliationDetail,
} from '../../api/shiftSessions.js';
import { formatDateTime } from '../../lib/datetime.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

function Section({ title, children }) {
  return (
    <Card className="space-y-4 p-4">
      <h2 className="border-b border-[var(--admin-border)] pb-2 text-sm font-semibold text-[var(--admin-text)]">
        {title}
      </h2>
      {children}
    </Card>
  );
}

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[var(--admin-brand)]/15';

export default function CashReconciliationReviewPage() {
  const confirmSave = useSaveConfirmation();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const row = await fetchReconciliationDetail(sessionId);
      setDetail(row);
    } catch (err) {
      setError(err?.message || 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(approved) {
    if (!approved && !managerNote.trim()) {
      setError('Manager note is required when rejecting.');
      return;
    }
    const confirmed = await confirmSave({
      title: approved ? 'Confirm discrepancy approval' : 'Confirm discrepancy rejection',
      message: approved
        ? 'Approve this shift discrepancy and save the manager decision?'
        : 'Reject this shift discrepancy with the entered manager note?',
      confirmLabel: approved ? 'Yes, approve' : 'Yes, reject',
      danger: !approved,
    });
    if (!confirmed) return;
    setBusy(approved ? 'approve' : 'reject');
    setError('');
    try {
      await decideReconciliation(sessionId, {
        approved,
        note: managerNote.trim(),
      });
      navigate('/branch-manager/audit?tab=discrepancies', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not save decision');
    } finally {
      setBusy('');
    }
  }

  const diff = Number(detail?.difference ?? 0);
  const diffPositive = diff > 0;
  const diffNegative = diff < 0;
  const tx = detail?.transactionSummary ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review shift discrepancy"
        description="Verify cash and product variances, then approve or reject the closing."
        actions={
          <Link
            to="/branch-manager/audit?tab=discrepancies"
            className="text-sm font-medium text-[var(--admin-brand)] hover:underline"
          >
            ← Back to list
          </Link>
        }
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : !detail ? (
        <p className="text-sm text-[var(--admin-muted)]">Shift not found.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">{detail.status}</Badge>
            {detail.differenceStatus && (
              <span className="text-xs text-[var(--admin-muted)]">
                {differenceStatusLabel(detail.differenceStatus)}
              </span>
            )}
          </div>

          <Section title="Shift information">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-[var(--admin-muted)]">Shift ID</dt>
                <dd className="font-medium text-[var(--admin-brand)]">{detail.shiftId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Cashier</dt>
                <dd className="font-medium">{detail.employeeName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Branch</dt>
                <dd className="font-medium">{detail.branchName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Open time</dt>
                <dd className="font-medium">{formatDateTime(detail.openedAt)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Close time</dt>
                <dd className="font-medium">{formatDateTime(detail.closedAt)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Approved by</dt>
                <dd className="font-medium">{detail.approvedByName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Approved at</dt>
                <dd className="font-medium">{formatDateTime(detail.approvedAt)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Cash summary">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-[var(--admin-muted)]">Opening fund</dt>
                <dd className="font-medium">{formatMoney(detail.openingFundAmount)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Cash revenue</dt>
                <dd className="font-medium">{formatMoney(detail.cashSales)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Cash refund</dt>
                <dd className="font-medium">{formatMoney(detail.refundAmount)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Expected cash</dt>
                <dd className="font-medium">{formatMoney(detail.expectedCash)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Actual cash</dt>
                <dd className="font-medium">{formatMoney(detail.actualCash)}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Difference</dt>
                <dd
                  className={`text-lg font-semibold ${
                    diffPositive ? 'text-emerald-600' : diffNegative ? 'text-red-600' : ''
                  }`}
                >
                  {formatMoney(detail.difference)}
                </dd>
              </div>
            </dl>
            {detail.cashierExplanation?.trim() && (
              <div className="rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2 text-sm">
                <p className="text-xs text-[var(--admin-muted)]">Cashier explanation</p>
                <p className="mt-1">{detail.cashierExplanation}</p>
              </div>
            )}
          </Section>

          <Section title="Transaction summary">
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <dt className="text-[var(--admin-muted)]">Total orders</dt>
                <dd className="text-lg font-semibold">{tx.totalOrders ?? 0}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Cash orders</dt>
                <dd className="text-lg font-semibold">{tx.cashOrders ?? 0}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Card orders</dt>
                <dd className="text-lg font-semibold">{tx.cardOrders ?? 0}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Refund orders</dt>
                <dd className="text-lg font-semibold">{tx.refundOrders ?? 0}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Cancelled orders</dt>
                <dd className="text-lg font-semibold">{tx.cancelledOrders ?? 0}</dd>
              </div>
            </dl>
          </Section>

          <Section title="High-value count (this shift)">
            <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Expected</th>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.highValueItems || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-[var(--admin-muted)]">
                        No high-value counts recorded for this shift.
                      </td>
                    </tr>
                  ) : (
                    detail.highValueItems.map((row) => (
                      <tr key={row.productId} className="border-t border-[var(--admin-border)]">
                        <td className="px-3 py-2">{row.productName || '—'}</td>
                        <td className="px-3 py-2 text-[var(--admin-muted)]">{row.categoryName || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.expectedQty ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.actualQty ?? '—'}</td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            Number(row.difference ?? 0) < 0
                              ? 'font-semibold text-red-600'
                              : Number(row.difference ?? 0) > 0
                                ? 'font-semibold text-emerald-600'
                                : ''
                          }`}
                        >
                          {row.difference ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Product variance vs previous shift">
            <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Prev. actual</th>
                    <th className="px-3 py-2 text-right">This expected</th>
                    <th className="px-3 py-2 text-right">This actual</th>
                    <th className="px-3 py-2 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.previousShiftProductVariance || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-[var(--admin-muted)]">
                        No previous-shift product variance available.
                      </td>
                    </tr>
                  ) : (
                    detail.previousShiftProductVariance.map((row) => (
                      <tr key={row.productId} className="border-t border-[var(--admin-border)]">
                        <td className="px-3 py-2">{row.productName || '—'}</td>
                        <td className="px-3 py-2 text-[var(--admin-muted)]">{row.categoryName || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.previousActualQty ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.currentExpectedQty ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.currentActualQty ?? '—'}
                        </td>
                        <td
                          className={`px-3 py-2 text-right tabular-nums ${
                            Number(row.variance ?? 0) < 0
                              ? 'font-semibold text-red-600'
                              : Number(row.variance ?? 0) > 0
                                ? 'font-semibold text-emerald-600'
                                : ''
                          }`}
                        >
                          {row.variance ?? '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Manager review">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--admin-muted)]">Manager note</span>
              <textarea
                className={inputClass}
                rows={4}
                placeholder="Optional for approve; required for reject."
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/branch-manager/audit?tab=discrepancies')}>
                Cancel
              </Button>
              <Button variant="secondary" disabled={busy === 'reject'} onClick={() => submit(false)}>
                Reject
              </Button>
              <Button disabled={busy === 'approve'} onClick={() => submit(true)}>
                Approve
              </Button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
