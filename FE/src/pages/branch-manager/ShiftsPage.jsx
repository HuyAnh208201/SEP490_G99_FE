import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMe } from '../../api/users.js';
import { fetchBranchById } from '../../api/branches.js';
import {
  assignToSlot,
  copyPreviousWeek,
  fetchAvailableEmployees,
  fetchWeekSetup,
  fetchWeeklySchedule,
  publishWeek,
  setupAndPublishWeek,
} from '../../api/shifts.js';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { deriveShiftSlots, MAX_SHIFT_HOURS, parseOperatingHours } from '../../lib/operatingHours.js';
import AssignModal from './shifts/AssignModal.jsx';
import ScheduleGrid from './shifts/ScheduleGrid.jsx';
import WeekSetupModal from './shifts/WeekSetupModal.jsx';
import {
  MAX_EMPLOYEES_PER_SHIFT,
  addDays,
  buildWeekDays,
  cellState,
  dateOf,
  fromDdMmYyyy,
  localIso,
  mondayOf,
  timeOf,
  toDdMmYyyy,
} from './shifts/shiftGrid.js';
import { useSaveConfirmation } from '../../contexts/SaveConfirmationContext.jsx';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function ShiftsPage() {
  const confirmSave = useSaveConfirmation();
  const [branchId, setBranchId] = useState(null);
  const [operatingHours, setOperatingHours] = useState('08:00 - 22:00');
  const [weekStart, setWeekStart] = useState(() => mondayOf());
  const [weekStartInput, setWeekStartInput] = useState(() => toDdMmYyyy(mondayOf()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [assignCtx, setAssignCtx] = useState(null);
  const [cashierIds, setCashierIds] = useState([]);
  const [inventoryIds, setInventoryIds] = useState([]);
  /** Cash float for the first slot of the day; null means "let the backend apply its default". */
  const [openingCash, setOpeningCash] = useState(null);
  const [availableCashiers, setAvailableCashiers] = useState([]);
  const [availableIs, setAvailableIs] = useState([]);
  const [availableLoaded, setAvailableLoaded] = useState(false);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupCashiers, setSetupCashiers] = useState([]);
  const [setupInventory, setSetupInventory] = useState([]);
  const [setupWeekStart, setSetupWeekStart] = useState('');
  /** @type {[Record<string, object>, Function]} */
  const [setupSlots, setSetupSlots] = useState({});
  const [activeSetupKey, setActiveSetupKey] = useState(null);
  const loadGenerationRef = useRef(0);

  const slots = useMemo(() => deriveShiftSlots(operatingHours), [operatingHours]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const applyWeekStart = useCallback((next) => {
    const normalized = mondayOf(next);
    setWeekStart(normalized);
    setWeekStartInput(toDdMmYyyy(normalized));
    setInfo('');
  }, []);

  const applySchedule = useCallback((data) => {
    const normalized = data?.weekStart ? String(data.weekStart).slice(0, 10) : '';
    if (normalized) {
      setWeekStart((current) => (current === normalized ? current : normalized));
      setWeekStartInput(toDdMmYyyy(normalized));
    }
    setRows((data?.days || []).flatMap((day) => day.shifts || []));
  }, []);

  const load = useCallback(async () => {
    if (!branchId) return;
    const requestedWeek = weekStart;
    const generation = ++loadGenerationRef.current;
    setRefreshing(true);
    setError('');
    try {
      const data = await fetchWeeklySchedule(branchId, requestedWeek);
      if (generation !== loadGenerationRef.current) return;
      applySchedule(data);
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      setError(err?.message || 'Failed to load shifts');
      setRows([]);
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applySchedule, branchId, weekStart]);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        if (!me?.branchId) {
          setError('Could not load branch context');
          return;
        }
        setBranchId(me.branchId);
        const branch = await fetchBranchById(me.branchId);
        if (branch?.operatingHours) setOperatingHours(branch.operatingHours);
      } catch {
        setError('Could not load branch context');
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

  const weekStats = useMemo(() => {
    let empty = 0;
    let incomplete = 0;
    let ready = 0;
    let published = 0;
    for (const day of weekDays) {
      for (const slot of slots) {
        const shift = grid[`${day.date}|${slot.key}`];
        const state = cellState(shift, slot);
        if (state === 'empty') empty += 1;
        else if (state === 'incomplete') incomplete += 1;
        else if (state === 'ready') ready += 1;
        else if (state === 'published') published += 1;
      }
    }
    return { empty, incomplete, ready, published, total: slots.length * weekDays.length };
  }, [grid, slots, weekDays]);

  const [displayStats, setDisplayStats] = useState(weekStats);
  useEffect(() => {
    if (!refreshing) setDisplayStats(weekStats);
  }, [refreshing, weekStats]);

  const openAssign = useCallback(
    (dayDate, slot) => {
      const shift = grid[`${dayDate}|${slot.key}`];
      if (shift?.status === 'PUBLISHED') return;

      const cashiers = (shift?.assignedEmployees || [])
        .filter((e) => e.role === 'CASHIER' && e.role !== 'CUSTOMER')
        .map((e) => e.employeeId);
      const inventory = (shift?.assignedEmployees || [])
        .filter((e) => e.role === 'INVENTORY_STAFF')
        .map((e) => e.employeeId);

      setAssignError('');
      setCashierIds(cashiers);
      setInventoryIds(inventory);
      setOpeningCash(shift?.openingCash != null ? Number(shift.openingCash) : null);
      setAssignCtx({ date: dayDate, slot, shift: shift || null });
    },
    [grid],
  );

  useEffect(() => {
    if (!assignCtx || !branchId) return;
    if (availableLoaded) {
      setAvailableLoading(false);
      return;
    }
    let cancelled = false;
    setAvailableLoading(true);
    setAssignError('');

    const startTime = `${assignCtx.slot.start}:00`;
    const endTime = `${assignCtx.slot.end}:00`;

    (async () => {
      try {
        const [cashiers, inventory] = await Promise.all([
          fetchAvailableEmployees({
            branchId,
            date: assignCtx.date,
            startTime,
            endTime,
            requiredRole: 'CASHIER',
          }),
          fetchAvailableEmployees({
            branchId,
            date: assignCtx.date,
            startTime,
            endTime,
            requiredRole: 'INVENTORY_STAFF',
          }),
        ]);
        if (cancelled) return;

        const assignedCashiers = (assignCtx.shift?.assignedEmployees || []).filter(
          (e) => e.role === 'CASHIER' && e.role !== 'CUSTOMER',
        );
        const assignedIs = (assignCtx.shift?.assignedEmployees || []).filter(
          (e) => e.role === 'INVENTORY_STAFF',
        );

        const merge = (available, assigned) => {
          const map = new Map();
          for (const e of available || []) map.set(e.employeeId, e);
          for (const e of assigned) {
            if (!map.has(e.employeeId)) {
              map.set(e.employeeId, {
                employeeId: e.employeeId,
                fullName: e.fullName,
                email: e.email,
                role: e.role,
              });
            }
          }
          return [...map.values()];
        };

        setAvailableCashiers(merge(
          (cashiers || []).filter((e) => e.role === 'CASHIER'),
          assignedCashiers,
        ));
        setAvailableIs(merge(inventory, assignedIs));
        setAvailableLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setAvailableCashiers([]);
          setAvailableIs([]);
          setAssignError(err?.message || 'Failed to load available staff');
        }
      } finally {
        if (!cancelled) setAvailableLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignCtx, availableLoaded, branchId]);

  function toggleRoleSelection(role, employeeId, checked) {
    const total = cashierIds.length + inventoryIds.length;
    if (checked && total >= MAX_EMPLOYEES_PER_SHIFT) {
      setAssignError(`Each shift can have at most ${MAX_EMPLOYEES_PER_SHIFT} employees.`);
      return;
    }
    setAssignError('');
    if (role === 'CASHIER') {
      setCashierIds((ids) =>
        checked ? (ids.includes(employeeId) ? ids : [...ids, employeeId]) : ids.filter((id) => id !== employeeId),
      );
      if (checked) setInventoryIds((ids) => ids.filter((id) => id !== employeeId));
    } else {
      setInventoryIds((ids) =>
        checked ? (ids.includes(employeeId) ? ids : [...ids, employeeId]) : ids.filter((id) => id !== employeeId),
      );
      if (checked) setCashierIds((ids) => ids.filter((id) => id !== employeeId));
    }
  }

  async function handleSaveAssign() {
    if (!assignCtx || !branchId || availableLoading) return;
    const total = cashierIds.length + inventoryIds.length;
    if (total > MAX_EMPLOYEES_PER_SHIFT) {
      setAssignError(`Each shift can have at most ${MAX_EMPLOYEES_PER_SHIFT} employees.`);
      return;
    }
    const confirmed = await confirmSave({
      title: total === 0 ? 'Confirm slot clearing' : 'Confirm shift assignments',
      message:
        total === 0
          ? 'Clear all employee assignments from this shift slot?'
          : `Save ${total} employee assignment(s) to this shift slot as a draft?`,
      confirmLabel: total === 0 ? 'Yes, clear slot' : 'Yes, save assignments',
    });
    if (!confirmed) return;
    setAssignError('');
    setBusy('assign');
    try {
      const savedShift = await assignToSlot({
        branchId,
        startTime: localIso(assignCtx.date, assignCtx.slot.start),
        endTime: localIso(assignCtx.date, assignCtx.slot.end),
        openingCash: assignCtx.slot.isFirst ? openingCash : null,
        cashiers: cashierIds,
        inventoryStaff: inventoryIds,
      });
      setAssignCtx(null);
      setInfo(total === 0 ? 'Slot cleared.' : 'Assignments saved as draft.');
      setRows((current) => {
        if (!savedShift) {
          return assignCtx.shift?.id
            ? current.filter((shift) => shift.id !== assignCtx.shift.id)
            : current;
        }
        const existingIndex = current.findIndex((shift) => shift.id === savedShift.id);
        if (existingIndex < 0) return [...current, savedShift];
        return current.map((shift, index) => (index === existingIndex ? savedShift : shift));
      });
    } catch (err) {
      setAssignError(err?.message || 'Failed to save');
    } finally {
      setBusy('');
    }
  }

  async function handleCopyWeek() {
    if (!branchId) return;
    setConfirmAction({
      type: 'copy',
      title: 'Copy previous week',
      message:
        'Copy Mon–Sun assignments from last week into empty slots? Existing assignments are kept.',
    });
  }

  async function runCopyWeek() {
    if (!branchId) return;
    setBusy('copy');
    setError('');
    setInfo('');
    try {
      const result = await copyPreviousWeek({ branchId, weekStart });
      const conflictHint =
        result?.conflicts?.length > 0
          ? ` Conflicts: ${result.conflicts.slice(0, 3).join(' · ')}${result.conflicts.length > 3 ? '…' : ''}`
          : '';
      setInfo(
        `Copied ${result?.copied ?? 0} slot(s), skipped ${result?.skipped ?? 0}.${conflictHint}`,
      );
      if (result?.schedule) applySchedule(result.schedule);
      else await load();
    } catch (err) {
      setError(err?.message || 'Failed to copy previous week');
    } finally {
      setBusy('');
    }
  }

  async function handlePublishWeek() {
    if (!branchId || weekStats.ready < 1) return;
    setConfirmAction({
      type: 'publish-week',
      title: 'Publish week',
      message: `Publish ${weekStats.ready} ready draft slot(s)? ${weekStats.incomplete} incomplete and ${weekStats.empty} empty will be skipped.`,
    });
  }

  async function runPublishWeek() {
    if (!branchId || weekStats.ready < 1) return;
    setBusy('publish-week');
    setError('');
    setInfo('');
    try {
      const result = await publishWeek({ branchId, weekStart });
      const skipped = result?.skipped || [];
      const skipHint =
        skipped.length > 0
          ? ` Skipped ${skipped.length}: ${skipped
              .slice(0, 2)
              .map((s) => s.reason)
              .join(' · ')}${skipped.length > 2 ? '…' : ''}`
          : '';
      setInfo(`Published ${result?.published ?? 0} shift(s).${skipHint}`);
      if (result?.schedule) applySchedule(result.schedule);
      else await load();
    } catch (err) {
      setError(err?.message || 'Failed to publish week');
    } finally {
      setBusy('');
    }
  }

  async function openWeekSetup() {
    if (!branchId) return;
    setSetupOpen(true);
    setSetupLoading(true);
    setSetupError('');
    setActiveSetupKey(null);
    try {
      const data = await fetchWeekSetup(branchId, weekStart);
      const responseWeekStart = data?.weekStart
        ? String(data.weekStart).slice(0, 10)
        : weekStart;
      setSetupWeekStart(responseWeekStart);
      if (responseWeekStart !== weekStart) {
        applyWeekStart(responseWeekStart);
      }
      setSetupCashiers((data?.cashiers || []).filter((e) => e.role === 'CASHIER'));
      setSetupInventory(data?.inventoryStaff || []);
      setAvailableCashiers(data?.cashiers || []);
      setAvailableIs(data?.inventoryStaff || []);
      setAvailableLoaded(true);
      const map = {};
      let firstEditableKey = null;
      for (const slot of data?.slots || []) {
        const key = `${slot.startTime}|${slot.endTime}`;
        const entry = {
          key,
          date: slot.date ? String(slot.date).slice(0, 10) : dateOf(slot.startTime),
          startTime: slot.startTime,
          endTime: slot.endTime,
          slotIndex: slot.slotIndex,
          first: Boolean(slot.first),
          last: Boolean(slot.last),
          // Backend prefills the configured default on first slots, so this is rarely blank.
          openingCash: slot.openingCash != null ? Number(slot.openingCash) : null,
          readOnly: Boolean(slot.readOnly || slot.published),
          published: Boolean(slot.published),
          cashiers: [...(slot.cashiers || [])],
          inventoryStaff: [...(slot.inventoryStaff || [])],
          assignedEmployees: slot.assignedEmployees || [],
        };
        map[key] = entry;
        if (!firstEditableKey && !entry.readOnly) firstEditableKey = key;
      }
      setSetupSlots(map);
      setActiveSetupKey(firstEditableKey || Object.keys(map)[0] || null);
      if (data?.operatingHours) setOperatingHours(data.operatingHours);
    } catch (err) {
      setSetupError(err?.message || 'Failed to load week setup');
      setSetupSlots({});
      setSetupWeekStart('');
    } finally {
      setSetupLoading(false);
    }
  }

  const toggleSetupSelection = useCallback((slotKey, role, employeeId, checked) => {
    setSetupSlots((prev) => {
      const slot = prev[slotKey];
      if (!slot || slot.readOnly) return prev;
      const cashiers = [...slot.cashiers];
      const inventoryStaff = [...slot.inventoryStaff];
      const total = cashiers.length + inventoryStaff.length;
      if (checked && total >= MAX_EMPLOYEES_PER_SHIFT) {
        setSetupError(`Each shift can have at most ${MAX_EMPLOYEES_PER_SHIFT} employees.`);
        return prev;
      }
      setSetupError('');
      if (role === 'CASHIER') {
        if (checked) {
          if (!cashiers.includes(employeeId)) cashiers.push(employeeId);
          const isIdx = inventoryStaff.indexOf(employeeId);
          if (isIdx >= 0) inventoryStaff.splice(isIdx, 1);
        } else {
          const idx = cashiers.indexOf(employeeId);
          if (idx >= 0) cashiers.splice(idx, 1);
        }
      } else if (checked) {
        if (!inventoryStaff.includes(employeeId)) inventoryStaff.push(employeeId);
        const cIdx = cashiers.indexOf(employeeId);
        if (cIdx >= 0) cashiers.splice(cIdx, 1);
      } else {
        const idx = inventoryStaff.indexOf(employeeId);
        if (idx >= 0) inventoryStaff.splice(idx, 1);
      }
      return { ...prev, [slotKey]: { ...slot, cashiers, inventoryStaff } };
    });
  }, []);

  const setSetupOpeningCash = useCallback((slotKey, value) => {
    setSetupSlots((prev) => {
      const slot = prev[slotKey];
      if (!slot || slot.readOnly) return prev;
      return { ...prev, [slotKey]: { ...slot, openingCash: value } };
    });
  }, []);

  async function handleSetupPublish() {
    if (!branchId || !setupWeekStart) return;
    const editable = Object.values(setupSlots).filter((s) => !s.readOnly);
    const ready = editable.filter(
      (s) =>
        s.cashiers.length >= 1 &&
        s.cashiers.length + s.inventoryStaff.length <= MAX_EMPLOYEES_PER_SHIFT &&
        (!(s.first || s.last) || s.inventoryStaff.length >= 1),
    );
    if (ready.length < 1) return;

    const skipped = editable.length - ready.length;
    setConfirmAction({
      type: 'setup-publish',
      title: 'Assign and publish',
      message:
        skipped > 0
          ? `Publish ${ready.length} ready slot(s)? ${skipped} empty/incomplete slot(s) will be skipped (holidays / days off).`
          : `Assign and publish ${ready.length} slot(s) for this week?`,
      ready,
    });
  }

  async function runSetupPublish(readySlots) {
    if (!branchId || !setupWeekStart) return;
    const ready = readySlots || [];
    if (ready.length < 1) return;
    setBusy('setup-publish');
    setSetupError('');
    try {
      const slotsPayload = ready.map((s) => ({
        startTime: s.startTime.length === 16 ? `${s.startTime}:00` : s.startTime,
        endTime: s.endTime.length === 16 ? `${s.endTime}:00` : s.endTime,
        openingCash: s.first ? (s.openingCash ?? null) : null,
        cashiers: s.cashiers,
        inventoryStaff: s.inventoryStaff,
      }));
      const result = await setupAndPublishWeek({
        branchId,
        weekStart: setupWeekStart,
        slots: slotsPayload,
      });
      setSetupOpen(false);
      setInfo(`Published ${result?.published ?? 0} shift(s) for the week.`);
      if (result?.schedule) applySchedule(result.schedule);
      else await load();
    } catch (err) {
      setSetupError(err?.message || 'Failed to set up and publish week');
    } finally {
      setBusy('');
    }
  }

  function runConfirmAction() {
    const action = confirmAction;
    if (!action) return;
    if (action.type === 'copy') runCopyWeek();
    else if (action.type === 'publish-week') runPublishWeek();
    else if (action.type === 'setup-publish') runSetupPublish(action.ready);
  }

  const hours = parseOperatingHours(operatingHours);
  const needsIs = assignCtx ? assignCtx.slot.isFirst || assignCtx.slot.isLast : false;
  const assignTotal = cashierIds.length + inventoryIds.length;
  const canSave =
    !availableLoading && (assignTotal > 0 || Boolean(assignCtx?.shift)) && assignTotal <= MAX_EMPLOYEES_PER_SHIFT;

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
            Branch operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-text)]">Shifts</h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Fixed slots from branch hours ({hours.open} – {hours.close}), max {MAX_SHIFT_HOURS}h each.
            Up to {MAX_EMPLOYEES_PER_SHIFT} staff per slot. Every slot needs a Cashier; first and last need
            Inventory Staff.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => applyWeekStart(addDays(weekStart, -7))}
            disabled={!!busy}
          >
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
            disabled={!!busy}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => applyWeekStart(addDays(weekStart, 7))}
            disabled={!!busy}
          >
            Next →
          </Button>
          <Button
            variant="secondary"
            loading={busy === 'copy'}
            onClick={handleCopyWeek}
            disabled={!branchId || !!busy}
          >
            Copy previous week
          </Button>
          <Button
            variant="secondary"
            loading={busy === 'publish-week'}
            onClick={handlePublishWeek}
            disabled={!branchId || !!busy || weekStats.ready < 1}
          >
            Publish week
          </Button>
          <Button onClick={openWeekSetup} disabled={!branchId || !!busy || setupLoading}>
            Set up week & publish
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--admin-muted)]">
        <span className="rounded-md border border-[var(--admin-border)] bg-[#f7f9fb] px-2.5 py-1 font-medium text-[var(--admin-text)]">
          {displayStats.ready}/{displayStats.total} ready to publish
          {displayStats.published > 0 ? ` · ${displayStats.published} published` : ''}
          {displayStats.incomplete > 0 ? ` · ${displayStats.incomplete} incomplete` : ''}
          {displayStats.empty > 0 ? ` · ${displayStats.empty} empty` : ''}
          {refreshing ? ' · Updating…' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-[var(--admin-border)] bg-white" />
          Empty
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50" />
          Incomplete
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#0058be]/35 bg-[#eef4fc]" />
          Ready draft
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-50" />
          Published
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {info && !error && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {info}
        </div>
      )}

      <ScheduleGrid
        loading={loading}
        refreshing={refreshing}
        slots={slots}
        weekDays={weekDays}
        grid={grid}
        busy={busy}
        branchId={branchId}
        onAssign={openAssign}
      />

      <AssignModal
        assignCtx={assignCtx}
        needsIs={needsIs}
        assignTotal={assignTotal}
        canSave={canSave}
        assignError={assignError}
        availableLoading={availableLoading}
        availableCashiers={availableCashiers}
        availableIs={availableIs}
        cashierIds={cashierIds}
        inventoryIds={inventoryIds}
        openingCash={openingCash}
        busy={busy}
        onClose={() => setAssignCtx(null)}
        onClear={() => {
          setCashierIds([]);
          setInventoryIds([]);
          setAssignError('');
        }}
        onSave={handleSaveAssign}
        onToggle={toggleRoleSelection}
        onOpeningCashChange={setOpeningCash}
      />

      <WeekSetupModal
        open={setupOpen}
        weekStart={setupWeekStart}
        setupLoading={setupLoading}
        setupError={setupError}
        setupSlots={setupSlots}
        setupCashiers={setupCashiers}
        setupInventory={setupInventory}
        activeSetupKey={activeSetupKey}
        busy={busy}
        onClose={() => setSetupOpen(false)}
        onPublish={handleSetupPublish}
        onSelectSlot={setActiveSetupKey}
        onToggleSelection={toggleSetupSelection}
        onOpeningCashChange={setSetupOpeningCash}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirmAction}
        title={confirmAction?.title || 'Confirm'}
        message={confirmAction?.message || ''}
        confirmLabel="Confirm"
      />
    </div>
  );
}
