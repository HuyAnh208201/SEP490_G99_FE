import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { isShiftClosing, isShiftOpen } from '../../api/shiftSessions.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { formatDateTime } from '../../lib/datetime.js';

export default function ShiftCurrentPage() {
  const navigate = useNavigate();
  const { session, loading } = useShiftSession();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0058be]/20 border-t-[#0058be]" />
      </div>
    );
  }

  if (!isShiftOpen(session) && !isShiftClosing(session)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 lg:p-6">
        <PageHeader title="Current shift" description="You do not have an active shift session." />
        <Button onClick={() => navigate('/pos/shift/opening')}>Go to shift opening</Button>
      </div>
    );
  }

  const shift = session?.shift;
  const pendingClose = isShiftClosing(session);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <PageHeader
        title="Current shift"
        description="Your active shift session. Use POS for sales until you end the shift."
      />

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
        {!pendingClose && (
          <Button onClick={() => navigate('/pos')}>Open POS</Button>
        )}
        <Button
          variant="secondary"
          onClick={() => navigate('/pos/shift/history')}
        >
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
