import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { isShiftClosing, isShiftOpen } from '../../api/shiftSessions.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { formatDateTime } from '../../lib/datetime.js';
import { getAutoCloseStatus, SHIFT_AUTO_CLOSE_GRACE_MINUTES } from '../../lib/shiftAutoClose.js';

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
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
          ? 'Shift end + grace period reached'
          : `Auto-close in about ${status.minutesLeft} min`}
      </p>
      <p className="mt-1">
        After the scheduled end time, you have {SHIFT_AUTO_CLOSE_GRACE_MINUTES} minutes to finish
        closing. Past that, the system auto-closes this session (expected cash, verified HV) and
        notifies the branch manager. Deadline: {formatDateTime(status.deadline.toISOString())}.
      </p>
    </Card>
  );
}

export default function ShiftCurrentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useShiftSession();
  const shiftClosed = location.state?.shiftClosed;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--admin-brand)]/20 border-t-[var(--admin-brand)]" />
      </div>
    );
  }

  if (!isShiftOpen(session) && !isShiftClosing(session)) {
    return (
      <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
        <PageHeader title="Current shift" description="You do not have an active shift session." />

        {shiftClosed === 'COMPLETED' && (
          <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">Shift closed successfully</p>
            <p className="mt-1">
              Your shift has been completed. Open the next published shift when your branch manager
              schedules it, or continue testing with another slot if one is available.
            </p>
          </Card>
        )}

        {shiftClosed === 'PENDING_APPROVAL' && (
          <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Submitted for manager approval</p>
            <p className="mt-1">
              Your closing was submitted with a cash or product count difference. The branch manager
              must approve or reject before you can open a new shift.
            </p>
          </Card>
        )}

        <Button onClick={() => navigate('/pos/shift/opening')}>Go to shift opening</Button>
      </div>
    );
  }

  const shift = session?.shift;
  const pendingClose = isShiftClosing(session);

  return (
    <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 space-y-6 overflow-y-auto p-4 lg:p-6">
      <PageHeader
        title="Current shift"
        description="Your active shift session. Use POS for sales until you end the shift."
      />

      <AutoCloseBanner session={session} />

      <Card className="space-y-4 bg-[#f7f9fb]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-[var(--admin-text)]">
            Shift #{shift?.shiftNumber ?? '—'}
          </p>
          <Badge tone={pendingClose ? 'warning' : 'success'}>
            {pendingClose ? 'Closing in progress' : 'Open'}
          </Badge>
        </div>
        {shift && (
          <p className="text-sm text-[var(--admin-muted)]">
            {formatDateTime(shift.startTime)} → {formatDateTime(shift.endTime)}
          </p>
        )}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--admin-muted)]">Cashier</dt>
            <dd className="font-medium">{session?.employeeName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Branch</dt>
            <dd className="font-medium">{session?.branchName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Opening fund</dt>
            <dd className="font-medium text-[var(--admin-brand)]">
              {formatMoney(session?.openingFundAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Opened at</dt>
            <dd className="font-medium">{formatDateTime(session?.openedAt)}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Status</dt>
            <dd className="font-medium">{session?.status}</dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-wrap gap-2">
        {!pendingClose && <Button onClick={() => navigate('/pos')}>Open POS</Button>}
        <Button variant="secondary" onClick={() => navigate('/pos/shift/history')}>
          Shift history
        </Button>
        <Button
          variant={pendingClose ? 'primary' : 'secondary'}
          onClick={() => navigate('/pos/shift/closing')}
        >
          {pendingClose ? 'Continue shift closing' : 'End shift'}
        </Button>
      </div>
    </div>
  );
}
