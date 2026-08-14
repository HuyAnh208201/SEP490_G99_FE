import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import {
  closeCashierShift,
  confirmHandover,
  confirmVerification,
  differenceStatusLabel,
  fetchClosingShiftSession,
  saveClosingDraft,
} from '../../api/shiftSessions.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';
import { formatDateTime } from '../../lib/datetime.js';
import { getAutoCloseStatus, SHIFT_AUTO_CLOSE_GRACE_MINUTES } from '../../lib/shiftAutoClose.js';
import { shouldLoadClosingDetails, shouldRenderClosingDetails } from './shiftClosingState.js';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[var(--admin-brand)]/15';

function varianceClass(value) {
  const n = Number(value ?? 0);
  if (n > 0) return 'text-emerald-600 font-semibold';
  if (n < 0) return 'text-red-600 font-semibold';
  return 'text-[var(--admin-text)]';
}

function AutoCloseBanner({ session }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const status = useMemo(() => getAutoCloseStatus(session, now), [session, now]);
  if (!status || status.state === 'ok') return null;
  const tone =
    status.state === 'overdue' || status.state === 'critical'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-amber-200 bg-amber-50 text-amber-900';
  return (
    <Card className={`p-4 text-sm ${tone}`}>
      <p className="font-semibold">
        {status.state === 'overdue'
          ? 'Finish closing now — grace period ended'
          : `Auto-close in about ${status.minutesLeft} min`}
      </p>
      <p className="mt-1">
        Complete verification and cash count within {SHIFT_AUTO_CLOSE_GRACE_MINUTES} minutes after
        shift end, or the system will auto-close and notify your branch manager. Deadline:{' '}
        {formatDateTime(status.deadline.toISOString())}.
      </p>
    </Card>
  );
}

export default function ShiftClosingPage() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading, refresh } = useShiftSession();
  const confirmSave = useSaveConfirmation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [hvRows, setHvRows] = useState([]);
  const [actualCash, setActualCash] = useState('');
  const [handoverRemark, setHandoverRemark] = useState('');
  const [handoverToEmployeeId, setHandoverToEmployeeId] = useState('');

  const load = useCallback(async () => {
    if (sessionLoading) return;
    if (!session) {
      setData(null);
      setError('No open shift session. Start your shift first.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const row = await fetchClosingShiftSession();
      setData(row);
      setHvRows(
        (row.highValueItems || []).map((item) => ({
          ...item,
          actualQty: item.actualQty ?? item.expectedQty ?? 0,
        })),
      );
      setActualCash(row.actualCash != null ? String(row.actualCash) : '');
      setHandoverRemark(row.handoverRemark ?? '');
      const candidates = row.handoverCandidates || [];
      const preferred = row.earlyClose
        ? candidates.find((candidate) => candidate.scheduledReplacement)
        : candidates[0];
      setHandoverToEmployeeId(String(row.handoverToEmployeeId ?? preferred?.employeeId ?? ''));
    } catch (err) {
      setError(err?.message || 'Failed to load closing data');
    } finally {
      setLoading(false);
    }
  }, [session, sessionLoading]);

  useEffect(() => {
    if (shouldLoadClosingDetails({ sessionLoading, session })) {
      load();
      return;
    }
    if (!sessionLoading) {
      setData(null);
      setError('No open shift session. Start your shift first.');
      setLoading(false);
    }
  }, [load, session, sessionLoading]);

  const cashDiff = useMemo(() => {
    const expected = Number(data?.expectedCash ?? 0);
    const actual = Number(actualCash || 0);
    return actual - expected;
  }, [data?.expectedCash, actualCash]);

  const remarkRequired = cashDiff !== 0;
  const differenceLabel = differenceStatusLabel(
    data?.differenceStatus ??
      (cashDiff === 0 ? 'BALANCED' : cashDiff < 0 ? 'CASH_SHORTAGE' : 'CASH_EXCESS'),
  );
  const managerRejectionNote = data?.managerNote || data?.reviewNote;
  const wasRejected =
    (data?.status === 'REJECTED' || data?.status === 'CLOSING') &&
    Boolean(managerRejectionNote?.trim());
  const handoverCandidates = data?.handoverCandidates || [];
  const hasScheduledReplacement = handoverCandidates.some(
    (candidate) => candidate.scheduledReplacement,
  );
  const earlyCloseBlocked = Boolean(data?.earlyClose && !hasScheduledReplacement);
  const canCloseCashier =
    data?.verificationConfirmed &&
    data?.handoverConfirmed &&
    handoverToEmployeeId &&
    !earlyCloseBlocked &&
    !['COMPLETED', 'CLOSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(data?.status);

  const shift = data?.shift;
  const isPendingApproval = data?.status === 'PENDING_APPROVAL';
  const productVariance = data?.previousShiftProductVariance || [];

  async function handleConfirmVerification() {
    if (earlyCloseBlocked) {
      setError('Early closing requires a replacement cashier scheduled for the current time.');
      return;
    }
    const confirmed = await confirmSave({
      title: 'Confirm stock verification',
      message: `Save the actual quantities for ${hvRows.length} high-value product(s)?`,
      confirmLabel: 'Yes, confirm verification',
    });
    if (!confirmed) return;
    setBusy('verify');
    setError('');
    try {
      const items = hvRows.map((row) => ({
        productId: row.productId,
        actualQty: Number(row.actualQty ?? 0),
      }));
      setData(await confirmVerification(items));
    } catch (err) {
      setError(err?.message || 'Verification failed');
    } finally {
      setBusy('');
    }
  }

  async function handleConfirmHandover() {
    const confirmed = await confirmSave({
      title: 'Confirm cash handover',
      message: `Save the handover with actual cash of ${formatMoney(actualCash)} and a difference of ${formatMoney(cashDiff)}?`,
      confirmLabel: 'Yes, confirm handover',
    });
    if (!confirmed) return;
    setBusy('handover');
    setError('');
    try {
      setData(
        await confirmHandover({
          actualCash: Number(actualCash),
          handoverToEmployeeId: Number(handoverToEmployeeId),
          remark: handoverRemark,
        }),
      );
    } catch (err) {
      setError(err?.message || 'Handover failed');
    } finally {
      setBusy('');
    }
  }

  async function handleSaveDraft() {
    const confirmed = await confirmSave({
      title: 'Confirm closing draft',
      message: 'Save the current cash count and handover notes as a draft?',
      confirmLabel: 'Yes, save draft',
    });
    if (!confirmed) return;
    setBusy('draft');
    setError('');
    try {
      setData(
        await saveClosingDraft({
          actualCash: actualCash ? Number(actualCash) : undefined,
          handoverRemark,
        }),
      );
    } catch (err) {
      setError(err?.message || 'Could not save draft');
    } finally {
      setBusy('');
    }
  }

  async function handleCloseShift() {
    const confirmed = await confirmSave({
      title: 'Confirm shift closing',
      message: 'Close this shift with the verified stock and confirmed cash handover?',
      confirmLabel: 'Yes, close shift',
    });
    if (!confirmed) return;
    setBusy('close');
    setError('');
    try {
      const updated = await closeCashierShift();
      await refresh();
      if (updated?.status === 'COMPLETED' || updated?.status === 'PENDING_APPROVAL') {
        navigate('/pos/shift/current', {
          replace: true,
          state: { shiftClosed: updated.status },
        });
        return;
      }
      setData(updated);
    } catch (err) {
      setError(err?.message || 'Could not close shift');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
        <PageHeader
          title="Shift Closing"
          description="Count cash first, then review shift summary and product variances before handover."
        />

        <AutoCloseBanner session={data} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {data?.earlyClose && (
          <Card
            className={`p-4 text-sm ${
              earlyCloseBlocked
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <p className="font-semibold">Early shift closing</p>
            <p className="mt-1">
              {earlyCloseBlocked
                ? 'A replacement cashier must be assigned to a published shift covering the current time before this shift can be handed over.'
                : 'A scheduled replacement is available. Select that cashier in Cash below before confirming the handover.'}
            </p>
          </Card>
        )}

        {isPendingApproval && (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Submitted for manager approval</p>
            <p className="mt-1">
              Your closing was submitted with a cash difference. The branch manager must approve or
              reject before you can open a new shift.
            </p>
          </Card>
        )}

        {wasRejected && (
          <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">Closing rejected by branch manager</p>
            <p className="mt-1">{managerRejectionNote}</p>
            <p className="mt-1 text-red-800">Please recount and resubmit your closing.</p>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
        ) : shouldRenderClosingDetails({ loading, data }) ? (
          <>
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--admin-text)]">Cash</h2>
                <Badge tone={data.handoverConfirmed ? 'success' : 'warning'}>
                  {data.handoverConfirmed ? 'Handover confirmed' : 'Waiting for handover'}
                </Badge>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-[var(--admin-muted)]">Opening fund</dt>
                  <dd className="font-semibold">{formatMoney(data.openingFundAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Cash sales</dt>
                  <dd className="font-semibold">{formatMoney(data.cashSales)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Refund amount</dt>
                  <dd className="font-semibold">{formatMoney(data.refundAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Expected cash</dt>
                  <dd className="font-semibold">{formatMoney(data.expectedCash)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Difference</dt>
                  <dd
                    className={`font-semibold ${
                      cashDiff === 0
                        ? 'text-[var(--admin-text)]'
                        : cashDiff < 0
                          ? 'text-red-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {formatMoney(cashDiff)} · {differenceLabel}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-3 border-t border-[var(--admin-border)] pt-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--admin-muted)]">Hand over cash to</span>
                  <select
                    value={handoverToEmployeeId}
                    onChange={(event) => setHandoverToEmployeeId(event.target.value)}
                    disabled={data.handoverConfirmed}
                    className={inputClass}
                  >
                    <option value="">Select recipient</option>
                    {handoverCandidates.map((candidate) => (
                      <option key={candidate.employeeId} value={candidate.employeeId}>
                        {candidate.employeeName} ·{' '}
                        {candidate.role === 'BRANCH_MANAGER' ? 'Branch manager' : 'Cashier'}
                        {candidate.scheduledReplacement ? ' · Scheduled now' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--admin-muted)]">Actual cash</span>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--admin-muted)]">
                  Remarks {remarkRequired ? '(required)' : '(optional)'}
                </span>
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder="Explain the reason for the cash difference…"
                  value={handoverRemark}
                  onChange={(e) => setHandoverRemark(e.target.value)}
                />
              </label>
              {remarkRequired && (
                <p className="text-xs text-amber-700">
                  An explanation is required when a cash difference exists.
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  disabled={
                    busy === 'handover' ||
                    !handoverToEmployeeId ||
                    earlyCloseBlocked ||
                    (remarkRequired && !handoverRemark.trim())
                  }
                  onClick={handleConfirmHandover}
                >
                  Confirm handover
                </Button>
              </div>
            </Card>

            {shift && (
              <Card className="bg-[#f7f9fb]">
                <h2 className="mb-2 text-sm font-semibold text-[var(--admin-text)]">Shift summary</h2>
                <p className="font-semibold text-[var(--admin-text)]">
                  Shift #{shift.shiftNumber} · {formatDateTime(shift.startTime)} →{' '}
                  {formatDateTime(shift.endTime)}
                </p>
                <p className="text-sm text-[var(--admin-muted)]">
                  {data.employeeName} · {data.branchName}
                </p>
              </Card>
            )}

            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--admin-text)]">
                  High-value count (this shift)
                </h2>
                <Badge tone={data.verificationConfirmed ? 'success' : 'warning'}>
                  {data.verificationConfirmed ? 'Verified' : 'Pending verification'}
                </Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--admin-brand)] text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Expected</th>
                      <th className="px-3 py-2 font-medium">Actual</th>
                      <th className="px-3 py-2 font-medium">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hvRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-3 py-6 text-center text-sm text-[var(--admin-muted)]"
                        >
                          No high-value items in branch stock yet. Create products in risk categories
                          (high-value tobacco, cosmetics &amp; beauty, prepaid / service cards,
                          premium alcohol), set retail price ≥ 300,000 VND, stock them at the branch,
                          then reopen Shift Closing.
                        </td>
                      </tr>
                    ) : (
                      hvRows.map((row) => {
                        const diff = Number(row.actualQty ?? 0) - Number(row.expectedQty ?? 0);
                        return (
                          <tr key={row.productId} className="border-t border-[var(--admin-border)]">
                            <td className="px-3 py-2">{row.productName}</td>
                            <td className="px-3 py-2 text-[var(--admin-muted)]">{row.categoryName}</td>
                            <td className="px-3 py-2">{row.expectedQty}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                className="w-20 rounded border border-[var(--admin-border)] bg-[#f7f9fb] px-2 py-1 outline-none focus:border-[var(--admin-brand)]"
                                value={row.actualQty}
                                onChange={(e) =>
                                  setHvRows((rows) =>
                                    rows.map((r) =>
                                      r.productId === row.productId
                                        ? { ...r, actualQty: e.target.value }
                                        : r,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className={`px-3 py-2 ${varianceClass(diff)}`}>{diff}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={busy === 'verify' || earlyCloseBlocked}
                  onClick={handleConfirmVerification}
                >
                  Confirm verification
                </Button>
              </div>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">
                Product variance vs previous shift
              </h2>
              <p className="text-xs text-[var(--admin-muted)]">
                Compare previous shift counted qty with this shift expected/actual high-value stock.
              </p>
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
                    {productVariance.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-sm text-[var(--admin-muted)]"
                        >
                          No previous closed cashier shift with high-value counts is available for
                          this branch.
                        </td>
                      </tr>
                    ) : (
                      productVariance.map((row) => (
                        <tr key={row.productId} className="border-t border-[var(--admin-border)]">
                          <td className="px-3 py-2">{row.productName || '—'}</td>
                          <td className="px-3 py-2 text-[var(--admin-muted)]">
                            {row.categoryName || '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.previousActualQty ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.currentExpectedQty ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {row.currentActualQty ?? '—'}
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums ${varianceClass(row.variance)}`}>
                            {row.variance ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-4">
              <p className="text-xs text-[var(--admin-muted)]">
                Complete verification and cash handover to close the shift.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busy === 'draft'} onClick={handleSaveDraft}>
                  Save draft
                </Button>
                <Button disabled={busy === 'close' || !canCloseCashier} onClick={handleCloseShift}>
                  Close shift
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
