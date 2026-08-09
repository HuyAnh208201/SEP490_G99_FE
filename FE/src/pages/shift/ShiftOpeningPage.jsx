import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { fetchOpeningShiftSession, startShiftSession } from '../../api/shiftSessions.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';

const OPENING_FUND_AMOUNT = 2_000_000;

function formatMoney(value) {
  const n = Number(value ?? OPENING_FUND_AMOUNT);
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
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0058be]/10 text-[var(--admin-brand)]">
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

function InfoCell({ icon, label, value }) {
  return (
    <div className="flex gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0058be]/10 text-[var(--admin-brand)]">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
          {icon}
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--admin-muted)]">{label}</p>
        <p className="font-medium text-[var(--admin-text)]">{value}</p>
      </div>
    </div>
  );
}

const ICON_USER = (
  <>
    <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </>
);

const ICON_BRANCH = (
  <path
    d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
  />
);

const ICON_SHIFT = (
  <path
    d="M8 7h8M8 12h8M8 17h5"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
  />
);

const ICON_CLOCK = (
  <>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 8v4l2.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </>
);

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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fundConfirmed, setFundConfirmed] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const row = await fetchOpeningShiftSession();
      setData(row);
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

  async function handleConfirmOpeningFund() {
    if (!fundConfirmed) return;
    setBusy('open');
    setError('');
    try {
      const row = await startShiftSession(undefined, true);
      setSession(row);
      await refresh();
      navigate('/pos/shift/current', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not open shift');
    } finally {
      setBusy('');
    }
  }

  const shift = data?.shift;
  const alreadyOpen = data?.status === 'OPEN';
  const canConfirm = Boolean(shift?.id && fundConfirmed && !alreadyOpen);
  const receiveDateSource = data?.openingFundReceivedAt ?? shift?.startTime;
  const openingFundDisplay = OPENING_FUND_AMOUNT;

  return (
    <div className="min-h-0 w-full flex-1 space-y-4 overflow-y-auto p-4 lg:p-5">
      <PageHeader
        title="Shift Opening"
        description="Review your shift details and start your assigned shift."
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
                  Current shift
                </p>
                <p className="mt-0.5 font-semibold text-[var(--admin-text)]">
                  Shift #{shift.shiftNumber ?? '—'}{' '}
                  <span className="font-normal tabular-nums text-[var(--admin-muted)]">
                    {formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}
                  </span>
                </p>
              </div>
              <span className="hidden h-8 w-px bg-[var(--admin-border)] sm:block" aria-hidden />
              <div className="flex items-center gap-2 text-[var(--admin-text)]">
                <span className="text-[var(--admin-brand)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                    {ICON_USER}
                  </svg>
                </span>
                {data.employeeName ?? '—'}
              </div>
              <div className="flex items-center gap-2 text-[var(--admin-text)]">
                <span className="text-[var(--admin-brand)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                    {ICON_BRANCH}
                  </svg>
                </span>
                {data.branchName ?? '—'}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader icon={ICON_SHIFT}>Shift information</SectionHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCell icon={ICON_USER} label="Cashier" value={data.employeeName ?? '—'} />
              <InfoCell icon={ICON_BRANCH} label="Branch" value={data.branchName ?? '—'} />
              <InfoCell
                icon={ICON_SHIFT}
                label="Shift number"
                value={`Shift #${shift.shiftNumber ?? '—'}`}
              />
              <InfoCell icon={ICON_CLOCK} label="Start time" value={formatShiftTime(shift.startTime)} />
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <SectionHeader
              icon={ICON_FUND}
              badge={
                <Badge tone={data.openingConfirmed || alreadyOpen ? 'success' : 'warning'}>
                  {data.openingConfirmed || alreadyOpen
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
                <p className="mt-0.5 text-xl font-semibold text-[var(--admin-text)]">
                  {formatMoney(openingFundDisplay)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--admin-muted)]">Receive date</p>
                <p className="mt-0.5 font-medium text-[var(--admin-text)]">
                  {formatReceiveDate(receiveDateSource)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--admin-muted)]">Received from</p>
                <p className="mt-0.5 font-medium text-[var(--admin-text)]">
                  {data.openingFundReceivedFromName ?? 'Branch manager'}
                </p>
              </div>
            </div>
            <label className="flex items-start gap-2 border-t border-[var(--admin-border)] pt-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={fundConfirmed}
                onChange={(e) => setFundConfirmed(e.target.checked)}
                disabled={alreadyOpen}
              />
              <span className="text-[var(--admin-text)]">
                I confirm that I have received the opening fund from the Branch Manager.
              </span>
            </label>
          </Card>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button disabled={!canConfirm || busy === 'open'} onClick={handleConfirmOpeningFund}>
              {busy === 'open' ? 'Confirming…' : 'Confirm opening fund'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
