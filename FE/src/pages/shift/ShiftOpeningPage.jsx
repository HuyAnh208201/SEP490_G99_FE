import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import {
  confirmOpeningFund,
  fetchOpeningShiftSession,
  startShiftSession,
} from '../../api/shiftSessions.js';
import { checkInShift } from '../../api/shifts.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { formatDateTime } from '../../lib/datetime.js';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

export default function ShiftOpeningPage() {
  const navigate = useNavigate();
  const { refresh, setSession } = useShiftSession();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [fundNote, setFundNote] = useState('');
  const [fundConfirmed, setFundConfirmed] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const row = await fetchOpeningShiftSession();
      setData(row);
      setNote(row?.openingNote ?? '');
      setFundConfirmed(Boolean(row?.openingConfirmed));
    } catch (err) {
      setError(err?.message || 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirmFund() {
    if (!fundConfirmed) return;
    setBusy('fund');
    setError('');
    try {
      const row = await confirmOpeningFund(fundNote);
      setData(row);
      setSession(row);
      await refresh();
    } catch (err) {
      setError(err?.message || 'Could not confirm opening fund');
    } finally {
      setBusy('');
    }
  }

  async function handleStart() {
    setBusy('start');
    setError('');
    try {
      const row = await startShiftSession(note);
      setSession(row);
      await refresh();
      navigate('/pos/shift/current', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not start shift');
    } finally {
      setBusy('');
    }
  }

  const shift = data?.shift;
  const checkedIn = Boolean(data?.checkedIn);
  const canStart = Boolean(shift?.id && data?.openingConfirmed && checkedIn);

  async function handleCheckIn() {
    if (!data?.shiftId) return;
    setBusy('checkin');
    setError('');
    try {
      await checkInShift(data.shiftId);
      await load();
      await refresh();
    } catch (err) {
      setError(err?.message || 'Check-in failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Shift Opening"
        description="Review your assigned shift and start working when ready."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading shift…</p>
      ) : !shift ? (
        <Card>
          <p className="text-sm text-[var(--admin-muted)]">
            No published shift is assigned to you for the current time. Contact your branch manager.
          </p>
        </Card>
      ) : (
        <>
          <Card className="bg-[#f7f9fb]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--admin-text)]">
                  Shift #{shift.shiftNumber ?? '—'}{' '}
                  <span className="font-normal text-[var(--admin-muted)]">
                    {formatDateTime(shift.startTime)} → {formatDateTime(shift.endTime)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {data.employeeName} · {data.branchName ?? 'Branch'}
                </p>
              </div>
              <Badge tone="default">System-assigned · Read-only</Badge>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Shift information</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--admin-muted)]">Employee</dt>
                <dd className="font-medium">{data.employeeName}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Shift number</dt>
                <dd className="font-medium">Shift #{shift.shiftNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Branch</dt>
                <dd className="font-medium">{data.branchName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Start time</dt>
                <dd className="font-medium">{formatDateTime(shift.startTime)}</dd>
              </div>
            </dl>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--admin-muted)]">Notes (optional)</span>
              <textarea
                className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
                rows={3}
                placeholder="Any notes before starting…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </Card>

          {shift && !checkedIn && (
            <Card className="space-y-3 border-amber-200 bg-amber-50/50">
              <h2 className="text-sm font-semibold text-[var(--admin-text)]">Check in</h2>
              <p className="text-sm text-[var(--admin-muted)]">
                Confirm arrival for your published shift before opening fund and starting the session.
              </p>
              <div className="flex justify-end">
                <Button disabled={busy === 'checkin'} onClick={handleCheckIn}>
                  {busy === 'checkin' ? 'Checking in…' : 'Check in to shift'}
                </Button>
              </div>
            </Card>
          )}

          <Card className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--admin-text)]">Opening fund</h2>
                <Badge tone={data.openingConfirmed ? 'success' : 'warning'}>
                  {data.openingConfirmed ? 'Fund confirmed' : 'Waiting for confirmation'}
                </Badge>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--admin-muted)]">Opening fund amount</dt>
                  <dd className="text-lg font-semibold">{formatMoney(data.openingFundAmount)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-muted)]">Received from</dt>
                  <dd className="font-medium">{data.openingFundReceivedFromName ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[var(--admin-muted)]">Receive date & time</dt>
                  <dd className="font-medium">{formatDateTime(data.openingFundReceivedAt)}</dd>
                </div>
              </dl>
              <label className="block text-sm">
                <span className="mb-1 block text-[var(--admin-muted)]">Notes (optional)</span>
                <textarea
                  className="w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
                  rows={2}
                  value={fundNote}
                  onChange={(e) => setFundNote(e.target.value)}
                />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={fundConfirmed}
                  onChange={(e) => setFundConfirmed(e.target.checked)}
                />
                <span>I confirm that I have received the opening fund from the branch manager.</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  disabled={!fundConfirmed || busy === 'fund' || data.openingConfirmed || !checkedIn}
                  onClick={handleConfirmFund}
                >
                  {data.openingConfirmed ? 'Opening fund confirmed' : busy === 'fund' ? 'Confirming…' : 'Confirm opening fund'}
                </Button>
              </div>
            </Card>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button disabled={!canStart || busy === 'start'} onClick={handleStart}>
              {busy === 'start' ? 'Starting…' : 'Confirm & start shift'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
