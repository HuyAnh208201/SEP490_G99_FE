import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMe } from '../../api/users.js';
import { checkInShift, fetchMyWeeklySchedule } from '../../api/shifts.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { deriveShiftSlots } from '../../lib/operatingHours.js';
import { formatDateTime } from '../../lib/datetime.js';
import ScheduleGrid from './shifts/ScheduleGrid.jsx';
import {
  addDays,
  buildWeekDays,
  dateOf,
  fromDdMmYyyy,
  mondayOf,
  timeOf,
  toDdMmYyyy,
  toLocalDateStr,
} from './shifts/shiftGrid.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function isCheckedInForUser(shift, userId) {
  if (!shift || userId == null) return false;
  const id = Number(userId);
  return (shift.assignedEmployees || []).some(
    (emp) => Number(emp.employeeId) === id && emp.checkInAt,
  );
}

function checkInWindow(shift, now = new Date()) {
  if (!shift?.startTime) return { open: true, reason: '' };
  const start = new Date(shift.startTime);
  const end = shift.endTime ? new Date(shift.endTime) : null;
  const openAt = new Date(start.getTime() - 30 * 60 * 1000);
  if (now < openAt) {
    return { open: false, reason: 'Opens 30 minutes before start' };
  }
  if (end && now > end) {
    return { open: false, reason: 'Shift ended' };
  }
  return { open: true, reason: '' };
}

export default function MyShiftsPage() {
  const confirmSave = useSaveConfirmation();
  const [userId, setUserId] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [operatingHours, setOperatingHours] = useState('08:00 - 22:00');
  const [weekStart, setWeekStart] = useState(() => mondayOf());
  const [weekStartInput, setWeekStartInput] = useState(() => toDdMmYyyy(mondayOf()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const loadGenerationRef = useRef(0);

  const slots = useMemo(() => deriveShiftSlots(operatingHours), [operatingHours]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const today = useMemo(() => toLocalDateStr(new Date()), []);

  const applyWeekStart = useCallback((next) => {
    const normalized = mondayOf(next);
    setWeekStart(normalized);
    setWeekStartInput(toDdMmYyyy(normalized));
  }, []);

  const applySchedule = useCallback((data) => {
    const normalized = data?.weekStart ? String(data.weekStart).slice(0, 10) : '';
    if (normalized) {
      setWeekStart((current) => (current === normalized ? current : normalized));
      setWeekStartInput(toDdMmYyyy(normalized));
    }
    if (data?.operatingHours) setOperatingHours(data.operatingHours);
    if (data?.branchId != null) setBranchId(data.branchId);
    setRows((data?.days || []).flatMap((day) => day.shifts || []));
  }, []);

  const load = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setRefreshing(true);
    setError('');
    try {
      const data = await fetchMyWeeklySchedule(weekStart);
      if (generation !== loadGenerationRef.current) return;
      applySchedule(data);
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      setError(err?.message || 'Failed to load schedule');
      setRows([]);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applySchedule, weekStart]);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        if (me?.id != null) setUserId(me.id);
        if (me?.branchId != null) setBranchId(me.branchId);
      } catch {
        // Schedule load still works via /shifts/my/weekly; user id only needed for highlight/check-in.
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grid = useMemo(() => {
    const map = {};
    for (const day of weekDays) {
      for (const slot of slots) {
        map[`${day.date}|${slot.key}`] = null;
      }
    }
    for (const shift of rows) {
      const d = dateOf(shift.startTime);
      if (d < weekStart || d > addDays(weekStart, 6)) continue;
      const start = timeOf(shift.startTime);
      const end = timeOf(shift.endTime);
      const slot =
        slots.find((s) => start >= s.start && start < s.end) ||
        slots.find((s) => s.start === start && s.end === end) ||
        null;
      if (!slot) continue;
      const key = `${d}|${slot.key}`;
      if (!map[key] || new Date(shift.startTime) < new Date(map[key].startTime)) {
        map[key] = shift;
      }
    }
    return map;
  }, [rows, slots, weekDays, weekStart]);

  const todayShifts = useMemo(() => {
    return rows
      .filter((shift) => dateOf(shift.startTime) === today && shift.status === 'PUBLISHED')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [rows, today]);

  async function handleCheckIn(shift) {
    const confirmed = await confirmSave({
      title: 'Confirm shift check-in',
      message: `Check in to the shift starting at ${formatDateTime(shift.startTime)}?`,
      confirmLabel: 'Yes, check in',
    });
    if (!confirmed) return;
    setBusyId(shift.id);
    setError('');
    try {
      await checkInShift(shift.id);
      await load();
    } catch (err) {
      setError(err?.message || 'Check-in failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-full w-full space-y-4 overflow-y-auto p-3 lg:p-4">
      <PageHeader
        title="My schedule"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => applyWeekStart(addDays(weekStart, -7))}>
              ← Prev
            </Button>
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              value={weekStartInput}
              onChange={(e) => setWeekStartInput(e.target.value)}
              onBlur={() => {
                const parsed = fromDdMmYyyy(weekStartInput);
                if (parsed) applyWeekStart(parsed);
                else setWeekStartInput(toDdMmYyyy(weekStart));
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.currentTarget.blur();
              }}
              className={inputClass + ' !w-[7.5rem]'}
              title="Week start (DD/MM/YYYY)"
            />
            <Button variant="secondary" size="sm" onClick={() => applyWeekStart(addDays(weekStart, 7))}>
              Next →
            </Button>
          </div>
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ScheduleGrid
        loading={loading}
        refreshing={refreshing}
        slots={slots}
        weekDays={weekDays}
        grid={grid}
        busy=""
        branchId={branchId}
        readOnly
        currentUserId={userId}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--admin-text)]">Today&apos;s check-in</p>
        </div>
        {todayShifts.length === 0 ? (
          <p className="p-4 text-sm text-[var(--admin-muted)]">No published shift assigned to you today.</p>
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {todayShifts.map((shift) => {
              const checkedIn = isCheckedInForUser(shift, userId);
              const windowState = checkInWindow(shift);
              const canCheckIn = !checkedIn && windowState.open;
              return (
                <li
                  key={shift.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--admin-text)]">
                      {formatDateTime(shift.startTime)} → {formatDateTime(shift.endTime)}
                    </p>
                    {!checkedIn && !windowState.open ? (
                      <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{windowState.reason}</p>
                    ) : null}
                  </div>
                  <Button
                    disabled={!canCheckIn || busyId === shift.id}
                    onClick={() => handleCheckIn(shift)}
                  >
                    {checkedIn
                      ? 'Checked in'
                      : busyId === shift.id
                        ? 'Checking in…'
                        : windowState.open
                          ? 'Check in'
                          : windowState.reason || 'Unavailable'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
