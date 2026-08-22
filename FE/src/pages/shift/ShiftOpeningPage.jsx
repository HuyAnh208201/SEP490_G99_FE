import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { fetchOpeningShiftSession, startShiftSession } from '../../api/shiftSessions.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';
import PreviousShiftReportSection from './components/PreviousShiftReportSection.jsx';
import { formatDateTime } from '../../lib/datetime.js';

const OPENING_FUND_AMOUNT = 2_000_000;

function formatMoney(value) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString('en-US')} VND`;
}

function formatShiftTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

function formatReceiveDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

function SectionHeader({ icon, children, badge }) {
  return (
    <div className="border-b border-[var(--admin-border)] pb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text)]">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--admin-brand)]/10 text-[var(--admin-brand)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              {icon}
            </svg>
          </span>
          {children}
        </h2>
        {badge}
      </div>
    </div>
  );
}

const ICON_FUND = (
  <path
    d="M12 3v18M8 7h6a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h8"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
  />
);

export default function ShiftOpeningPage() {
  const navigate = useNavigate();
  const { refresh, setSession } = useShiftSession();
  const confirmSave = useSaveConfirmation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fundConfirmed, setFundConfirmed] = useState(false);
  const [fundSourceId, setFundSourceId] = useState('');
  const [fundMethod, setFundMethod] = useState('CASH');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const row = await fetchOpeningShiftSession();
      setData(row);
      setFundConfirmed(Boolean(row?.openingConfirmed));
      const sources = row?.openingFundSources || [];
      setFundSourceId(String(row?.openingFundReceivedFromEmployeeId ?? sources[0]?.employeeId ?? ''));
      setFundMethod(row?.openingFundMethod === 'TRANSFER' ? 'TRANSFER' : 'CASH');
    } catch (err) {
      setError(err?.message || 'Failed to load shift');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || !data) return;
    if (data.status === 'OPEN' || data.joinedExistingShift) {
      navigate('/pos', { replace: true });
    }
  }, [loading, data, navigate]);

  const shift = data?.shift;
  const slotLabel = data?.currentSlotLabel;
  const slotWindow =
    data?.currentSlotStart && data?.currentSlotEnd
      ? `${data.currentSlotStart.slice(0, 5)} – ${data.currentSlotEnd.slice(0, 5)}`
      : null;

  const openingFundDisplay = useMemo(() => {
    if (data?.openingFundAmount != null) return data.openingFundAmount;
    return data?.previousShiftReport ? 0 : OPENING_FUND_AMOUNT;
  }, [data?.openingFundAmount, data?.previousShiftReport]);

  async function handleOpenShift() {
    if (!fundConfirmed) return;
    const confirmed = await confirmSave({
      title: 'Confirm shift opening',
      message: `Open this cashier shift with ${formatMoney(openingFundDisplay)} received by ${fundMethod.toLowerCase()}?`,
      confirmLabel: 'Yes, open shift',
    });
    if (!confirmed) return;
    setBusy('open');
    setError('');
    try {
      const row = await startShiftSession({
        confirmedReceived: true,
        receivedFromEmployeeId: Number(fundSourceId),
        fundMethod,
      });
      setSession(row);
      await refresh();
      navigate('/pos/shift/current', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not open shift');
    } finally {
      setBusy('');
    }
  }

  const alreadyOpen = data?.status === 'OPEN';
  const pendingApproval = data?.status === 'PENDING_APPROVAL';
  const shiftFinished = ['COMPLETED', 'CLOSED', 'APPROVED'].includes(data?.status);
  const mustCloseFirst = ['CLOSING', 'PENDING_HANDOVER', 'REJECTED'].includes(data?.status);
  const canOpen = Boolean(
    shift?.id &&
      fundConfirmed &&
      fundSourceId &&
      fundMethod &&
      !alreadyOpen &&
      !pendingApproval &&
      !shiftFinished &&
      !mustCloseFirst,
  );
  const receiveDateSource = data?.openingFundReceivedAt ?? shift?.startTime;

  return (
    <div className="min-h-0 w-full flex-1 space-y-4 overflow-y-auto p-4 lg:p-5">
      <PageHeader
        title="Shift Opening"
        description="Review your shift details and start your assigned shift."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && data?.outsideOperatingHours && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Outside normal branch hours — test mode is enabled so you can still open this shift slot
          {slotLabel ? ` (${slotLabel}${slotWindow ? `, ${slotWindow}` : ''})` : ''}.
        </Card>
      )}

      {!loading && shiftFinished && (
        <Card className="border-[var(--admin-brand-soft)] bg-[var(--admin-brand)]/5 p-4 text-sm text-[var(--admin-text)]">
          <p>
            This shift is already completed
            {data?.closedAt ? ` (closed ${formatDateTime(data.closedAt)})` : ''}. You cannot open the same shift
            slot again.
          </p>
          <p className="mt-2 text-[var(--admin-muted)]">
            Wait for your next published shift, or check Shift history. If you were testing by changing your PC clock,
            move the clock back before the shift end time and reload this page — the system can reset auto-closed
            sessions automatically.
          </p>
        </Card>
      )}

      {!loading && pendingApproval && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your previous closing is waiting for branch manager cash approval. You cannot open a new shift yet.
        </Card>
      )}

      {!loading && mustCloseFirst && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {data?.status === 'REJECTED'
            ? 'Your closing was rejected by the branch manager. Complete Shift Closing first.'
            : 'This shift is still in the closing process. Finish Shift Closing before opening again.'}
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate('/pos/shift/closing')}>
              Go to Shift Closing
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading shift…</p>
      ) : !shift ? (
        <Card className="p-4">
          <p className="text-sm text-[var(--admin-muted)]">
            No published shift is assigned to you for the current time. Contact your branch manager.
          </p>
        </Card>
      ) : (
        <>
          <Card className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <p className="font-semibold text-[var(--admin-text)]">
                Shift #{shift.shiftNumber ?? '—'}
                <span className="ml-2 font-normal tabular-nums text-[var(--admin-muted)]">
                  {formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}
                </span>
              </p>
              <span className="hidden h-4 w-px bg-[var(--admin-border)] sm:block" aria-hidden />
              <span className="text-[var(--admin-text)]">{data.employeeName ?? '—'}</span>
              <span className="text-[var(--admin-muted)]">@</span>
              <span className="text-[var(--admin-text)]">{data.branchName ?? '—'}</span>
              {slotLabel && (
                <Badge tone="brand">
                  {slotLabel}
                  {slotWindow ? ` ${slotWindow}` : ''}
                </Badge>
              )}
              {alreadyOpen && <Badge tone="success">Open</Badge>}
            </div>
          </Card>

          {!shiftFinished ? (
            <PreviousShiftReportSection report={data.previousShiftReport} />
          ) : null}

          <Card className="space-y-4 p-4">
            <SectionHeader
              icon={ICON_FUND}
              badge={
                <Badge tone={data.openingFundStatus === 'OPENING_FUND_CONFIRMED' || alreadyOpen ? 'success' : 'warning'}>
                  {data.openingFundStatus === 'OPENING_FUND_CONFIRMED' || alreadyOpen
                    ? 'Opening fund confirmed'
                    : 'Waiting for opening fund'}
                </Badge>
              }
            >
              Opening fund confirmation
            </SectionHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--admin-muted)]">Opening fund amount</p>
                <p className="mt-0.5 text-xl font-semibold text-[var(--admin-brand)]">
                  {formatMoney(openingFundDisplay)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-muted)]">Receive date</p>
                <p className="mt-0.5 font-medium text-[var(--admin-text)]">
                  {formatReceiveDate(receiveDateSource)}
                </p>
              </div>
              <label>
                <span className="text-xs text-[var(--admin-muted)]">Received from</span>
                <select
                  value={fundSourceId}
                  onChange={(event) => setFundSourceId(event.target.value)}
                  disabled={alreadyOpen}
                  className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-brand)]"
                >
                  <option value="">Select handover person</option>
                  {(data.openingFundSources || []).map((source) => (
                    <option key={source.employeeId} value={source.employeeId}>
                      {source.employeeName} · {source.role === 'BRANCH_MANAGER' ? 'Branch manager' : 'Previous cashier'}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-xs text-[var(--admin-muted)]">Receive by</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {[
                    ['CASH', 'Cash'],
                    ['TRANSFER', 'Transfer'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={alreadyOpen}
                      onClick={() => setFundMethod(value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        fundMethod === value
                          ? 'border-[var(--admin-brand)] bg-[var(--admin-brand)] text-white'
                          : 'border-[var(--admin-border)] bg-white text-[var(--admin-muted)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-start gap-2 border-t border-[var(--admin-border)] pt-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--admin-brand)]"
                checked={fundConfirmed}
                onChange={(e) => setFundConfirmed(e.target.checked)}
                disabled={alreadyOpen}
              />
              <span className="text-[var(--admin-text)]">
                I confirm that I received the opening fund from the selected person by{' '}
                {fundMethod === 'TRANSFER' ? 'bank transfer' : 'cash'}.
              </span>
            </label>
          </Card>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button disabled={!canOpen || busy === 'open'} onClick={handleOpenShift}>
              {busy === 'open' ? 'Opening…' : alreadyOpen ? 'Shift already open' : 'Open shift'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
