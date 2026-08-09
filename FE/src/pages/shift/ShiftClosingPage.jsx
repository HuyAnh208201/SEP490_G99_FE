import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { formatDateTime } from '../../lib/datetime.js';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

export default function ShiftClosingPage() {
  const { refresh } = useShiftSession();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [hvRows, setHvRows] = useState([]);
  const [actualCash, setActualCash] = useState('');
  const [handoverRemark, setHandoverRemark] = useState('');

  const load = useCallback(async () => {
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
    } catch (err) {
      setError(err?.message || 'Failed to load closing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cashDiff = useMemo(() => {
    const expected = Number(data?.expectedCash ?? 0);
    const actual = Number(actualCash || 0);
    return actual - expected;
  }, [data?.expectedCash, actualCash]);

  const remarkRequired = cashDiff !== 0;

  async function handleConfirmVerification() {
    setBusy('verify');
    setError('');
    try {
      const items = hvRows.map((row) => ({
        productId: row.productId,
        actualQty: Number(row.actualQty ?? 0),
      }));
      const row = await confirmVerification(items);
      setData(row);
    } catch (err) {
      setError(err?.message || 'Verification failed');
    } finally {
      setBusy('');
    }
  }

  async function handleConfirmHandover() {
    setBusy('handover');
    setError('');
    try {
      const row = await confirmHandover({
        actualCash: Number(actualCash),
        remark: handoverRemark,
      });
      setData(row);
    } catch (err) {
      setError(err?.message || 'Handover failed');
    } finally {
      setBusy('');
    }
  }

  async function handleSaveDraft() {
    setBusy('draft');
    setError('');
    try {
      const row = await saveClosingDraft({
        actualCash: actualCash ? Number(actualCash) : undefined,
        handoverRemark,
      });
      setData(row);
    } catch (err) {
      setError(err?.message || 'Could not save draft');
    } finally {
      setBusy('');
    }
  }

  async function handleCloseShift() {
    setBusy('close');
    setError('');
    try {
      const updated = await closeCashierShift();
      // The shift is not finished on close anymore: it now awaits manager
      // approval. Keep the cashier on this page and surface the pending state
      // instead of navigating away as if the shift were fully closed.
      setData((prev) => updated ?? (prev ? { ...prev, status: 'PENDING_APPROVAL' } : prev));
      await refresh();
    } catch (err) {
      setError(err?.message || 'Could not close shift');
    } finally {
      setBusy('');
    }
  }

  const isPendingApproval = data?.status === 'PENDING_APPROVAL';
  const managerRejectionNote = data?.managerNote || data?.reviewNote;
  const wasRejected =
    (data?.status === 'REJECTED' || data?.status === 'CLOSING') &&
    Boolean(managerRejectionNote?.trim());

  const canCloseCashier =
    data?.verificationConfirmed &&
    data?.handoverConfirmed &&
    !['COMPLETED', 'CLOSED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(data?.status);

  const differenceLabel = differenceStatusLabel(
    data?.differenceStatus ??
      (cashDiff === 0 ? 'BALANCED' : cashDiff < 0 ? 'CASH_SHORTAGE' : 'CASH_EXCESS'),
  );

  const shift = data?.shift;

  return (
    <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
      <PageHeader
        title="Shift Closing"
        description="Review your shift before ending and completing handover."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : (
        <>
          {isPendingApproval && (
            <Card className="border-amber-200 bg-amber-50">
              <p className="font-semibold text-amber-800">Pending manager approval</p>
              <p className="mt-1 text-sm text-amber-700">
                Your shift has been submitted and is waiting for the branch manager to
                review the cash difference. You can start a new shift once it is approved.
              </p>
            </Card>
          )}

          {wasRejected && (
            <Card className="border-red-200 bg-red-50">
              <p className="font-semibold text-red-800">Manager rejected this shift</p>
              <p className="mt-1 text-sm text-red-700">
                Manager rejected: {managerRejectionNote} — please recount the cash and resubmit.
              </p>
            </Card>
          )}

          {shift && (
            <Card className="bg-[#f7f9fb]">
              <p className="font-semibold">
                Shift #{shift.shiftNumber} · {formatDateTime(shift.startTime)} →{' '}
                {formatDateTime(shift.endTime)}
              </p>
              <p className="text-sm text-[var(--admin-muted)]">
                {data.employeeName} · {data.branchName}
              </p>
            </Card>
          )}

          <Card className="space-y-4">
              <h2 className="text-sm font-semibold">Shift summary</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-[var(--admin-muted)]">Opening fund</dt>
                  <dd className="font-semibold">{formatMoney(data.openingFundAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Transactions</dt>
                  <dd className="font-semibold">{data.transactionCount ?? 0}</dd>
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
              </dl>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-white px-4 py-3 text-sm">
                <span className="text-[var(--admin-muted)]">Actual cash counted</span>
                <span className="font-semibold">{formatMoney(actualCash || data.actualCash)}</span>
                <Badge tone={cashDiff === 0 ? 'success' : 'warning'}>
                  Difference {formatMoney(cashDiff)} · {differenceLabel}
                </Badge>
              </div>
            </Card>

          <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">High-value item verification</h2>
                <Badge tone={data.verificationConfirmed ? 'success' : 'warning'}>
                  {data.verificationConfirmed ? 'Verified' : 'Pending verification'}
                </Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--admin-border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--admin-text)] text-white">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Expected</th>
                      <th className="px-3 py-2 font-medium">Actual</th>
                      <th className="px-3 py-2 font-medium">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hvRows.map((row) => {
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
                              className="w-20 rounded border border-[var(--admin-border)] px-2 py-1"
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
                          <td className="px-3 py-2">{diff}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button disabled={busy === 'verify'} onClick={handleConfirmVerification}>
                  Confirm verification
                </Button>
              </div>
            </Card>

          <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Cash handover</h2>
                <Badge tone={data.handoverConfirmed ? 'success' : 'warning'}>
                  {data.handoverConfirmed ? 'Handover confirmed' : 'Waiting for handover'}
                </Badge>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--admin-muted)]">Incoming cashier</dt>
                  <dd className="font-medium">{data.handoverToEmployeeName ?? 'Branch manager'}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Expected cash</dt>
                  <dd className="font-medium">{formatMoney(data.expectedCash)}</dd>
                </div>
              </dl>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--admin-muted)]">Actual cash</span>
                <input
                  type="number"
                  min={0}
                  className="w-full max-w-xs rounded-lg border border-[var(--admin-border)] px-3 py-2"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--admin-muted)]">
                  Remarks {remarkRequired ? '(required)' : '(optional)'}
                </span>
                <textarea
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2"
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
              <div className="flex justify-end gap-2">
                <Button
                  disabled={busy === 'handover' || (remarkRequired && !handoverRemark.trim())}
                  onClick={handleConfirmHandover}
                >
                  Confirm handover
                </Button>
              </div>
            </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-4">
            <p className="text-xs text-[var(--admin-muted)]">
              Complete verification and handover to close the shift.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={busy === 'draft'} onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button
                disabled={busy === 'close' || !canCloseCashier}
                onClick={handleCloseShift}
              >
                Close shift
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
