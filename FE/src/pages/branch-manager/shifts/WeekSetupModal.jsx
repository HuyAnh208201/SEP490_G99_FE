import { useMemo } from 'react';
import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import MoneyInput from '../../../components/ui/MoneyInput.jsx';
import { formatVnd } from '../../../lib/money.js';
import StaffPicker from './StaffPicker.jsx';
import {
  CELL_STYLES,
  MAX_EMPLOYEES_PER_SHIFT,
  buildWeekDays,
  roleLabel,
  slotStaffingIssues,
  timeOf,
} from './shiftGrid.js';

export default function WeekSetupModal({
  open,
  weekStart,
  setupLoading,
  setupError,
  setupSlots,
  setupCashiers,
  setupInventory,
  activeSetupKey,
  busy,
  onClose,
  onPublish,
  onSelectSlot,
  onToggleSelection,
  onOpeningCashChange,
}) {
  const setupDays = useMemo(() => (weekStart ? buildWeekDays(weekStart) : []), [weekStart]);

  const setupSlotList = useMemo(
    () => Object.values(setupSlots).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
    [setupSlots],
  );

  const setupSlotIndexes = useMemo(
    () => [...new Set(setupSlotList.map((s) => s.slotIndex))].sort((a, b) => a - b),
    [setupSlotList],
  );

  const slotByCell = useMemo(() => {
    const map = {};
    for (const slot of setupSlotList) {
      map[`${slot.date}|${slot.slotIndex}`] = slot;
    }
    return map;
  }, [setupSlotList]);

  const setupProgress = useMemo(() => {
    const editable = setupSlotList.filter((s) => !s.readOnly);
    let ready = 0;
    for (const slot of editable) {
      if (slotStaffingIssues(slot.cashiers, slot.inventoryStaff, slot.first, slot.last).length === 0) {
        ready += 1;
      }
    }
    return {
      ready,
      total: editable.length,
      published: setupSlotList.filter((s) => s.published).length,
    };
  }, [setupSlotList]);

  const nameById = useMemo(() => {
    const map = new Map();
    for (const e of setupCashiers) map.set(e.employeeId, e);
    for (const e of setupInventory) map.set(e.employeeId, e);
    return map;
  }, [setupCashiers, setupInventory]);

  const activeSetupSlot = activeSetupKey ? setupSlots[activeSetupKey] : null;
  const activeTotal = activeSetupSlot
    ? activeSetupSlot.cashiers.length + activeSetupSlot.inventoryStaff.length
    : 0;
  const needsIs = Boolean(activeSetupSlot && (activeSetupSlot.first || activeSetupSlot.last));

  return (
    <Modal
      open={open}
      onClose={() => {
        if (busy === 'setup-publish') return;
        onClose();
      }}
      title="Set up week & publish"
      description={`${weekStart || ''} · assign up to ${MAX_EMPLOYEES_PER_SHIFT} staff per slot. Empty slots (holidays / days off) can be skipped.`}
      size="full"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-[var(--admin-muted)]">
            {setupProgress.ready}/{setupProgress.total} slots ready
            {setupProgress.ready < setupProgress.total
              ? ' — empty slots will be skipped'
              : ''}
            {setupProgress.published > 0 ? ` · ${setupProgress.published} already published` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={busy === 'setup-publish'} onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={busy === 'setup-publish'}
              disabled={setupLoading || setupProgress.ready < 1}
              onClick={onPublish}
            >
              Publish ready slots
            </Button>
          </div>
        </div>
      }
    >
      {setupLoading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading week setup…</p>
      ) : (
        <div className="space-y-3">
          {setupError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {setupError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-[#f7f9fb] text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
                <tr>
                  <th className="sticky left-0 z-10 bg-[#f7f9fb] px-2 py-2">Slot</th>
                  {setupDays.map((day) => (
                    <th key={day.date} className="min-w-[8.5rem] px-1.5 py-2 text-center">
                      <div>{day.label}</div>
                      <div className="font-normal normal-case text-[var(--admin-muted)]">
                        {day.date.slice(5)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {setupSlotIndexes.map((slotIndex) => {
                  const sample = setupDays
                    .map((day) => slotByCell[`${day.date}|${slotIndex}`])
                    .find(Boolean);
                  const label = sample
                    ? `${timeOf(sample.startTime)} – ${timeOf(sample.endTime)}`
                    : `Slot ${slotIndex + 1}`;
                  return (
                    <tr key={slotIndex} className="border-t border-[var(--admin-border)] align-top">
                      <td className="sticky left-0 z-10 bg-white px-2 py-2 text-xs font-semibold">
                        <div>{label}</div>
                        {sample && (sample.first || sample.last) && (
                          <div className="mt-0.5 font-normal text-[var(--admin-subtle)]">
                            {sample.first && sample.last
                              ? 'Open + close (IS)'
                              : sample.first
                                ? 'Open (IS)'
                                : 'Close (IS)'}
                          </div>
                        )}
                      </td>
                      {setupDays.map((day) => {
                        const slot = slotByCell[`${day.date}|${slotIndex}`];
                        if (!slot) {
                          return (
                            <td
                              key={day.date}
                              className="border-l border-[var(--admin-border)] p-1"
                            />
                          );
                        }
                        const issues = slotStaffingIssues(
                          slot.cashiers,
                          slot.inventoryStaff,
                          slot.first,
                          slot.last,
                        );
                        const total = slot.cashiers.length + slot.inventoryStaff.length;
                        const state = slot.published
                          ? 'published'
                          : issues.length
                            ? total === 0
                              ? 'empty'
                              : 'incomplete'
                            : 'ready';
                        return (
                          <td key={slot.key} className="border-l border-[var(--admin-border)] p-1">
                            <button
                              type="button"
                              disabled={busy === 'setup-publish'}
                              onClick={() => onSelectSlot(slot.key)}
                              className={`flex w-full min-h-[4.25rem] flex-col gap-1 rounded-lg px-1.5 py-1.5 text-left ${CELL_STYLES[state]} ${
                                activeSetupKey === slot.key ? 'ring-2 ring-[#0058be]/40' : ''
                              } cursor-pointer`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-semibold uppercase text-[var(--admin-subtle)]">
                                  {slot.published ? 'Published' : 'Edit'}
                                </span>
                                <span className="text-[10px] text-[var(--admin-muted)]">
                                  {total}/{MAX_EMPLOYEES_PER_SHIFT}
                                </span>
                              </div>
                              <ul className="space-y-0.5 text-[11px] text-[var(--admin-text)]">
                                {[
                                  ...slot.cashiers.map((id) => ({ id, role: 'CASHIER' })),
                                  ...slot.inventoryStaff.map((id) => ({
                                    id,
                                    role: 'INVENTORY_STAFF',
                                  })),
                                ].map(({ id, role }) => (
                                  <li key={`${role}-${id}`}>
                                    <span className="font-medium">
                                      {nameById.get(id)?.fullName || `#${id}`}
                                    </span>
                                    <span className="text-[var(--admin-subtle)]">
                                      {' '}
                                      · {roleLabel(role)}
                                    </span>
                                  </li>
                                ))}
                                {total === 0 && !slot.published && (
                                  <li className="text-[var(--admin-muted)]">Add staff</li>
                                )}
                              </ul>
                              {slot.first && (
                                <p className="text-[10px] tabular-nums text-[var(--admin-subtle)]">
                                  Float {formatVnd(slot.openingCash)}
                                </p>
                              )}
                              {issues.length > 0 && !slot.published && (
                                <p className="text-[10px] font-medium text-amber-800">
                                  Needs {issues.filter((i) => i !== 'staff').join(' + ') || 'staff'}
                                </p>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-[var(--admin-border)] p-3">
            {!activeSetupSlot ? (
              <p className="text-sm text-[var(--admin-muted)]">Select a slot to assign staff.</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--admin-text)]">
                      {activeSetupSlot.date} · {timeOf(activeSetupSlot.startTime)} –{' '}
                      {timeOf(activeSetupSlot.endTime)}
                      {activeSetupSlot.published ? ' · Published' : ''}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {needsIs ? 'Cashier + Inventory Staff required' : 'Cashier required'} ·{' '}
                      {activeTotal}/{MAX_EMPLOYEES_PER_SHIFT} selected
                    </p>
                  </div>
                </div>
                {activeSetupSlot.first && (
                  <div className="mb-3 rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] p-3">
                    {activeSetupSlot.readOnly ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                          Opening cash
                        </p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-[var(--admin-text)]">
                          {formatVnd(activeSetupSlot.openingCash)}
                        </p>
                      </>
                    ) : (
                      <FormField label="Opening cash">
                        <MoneyInput
                          value={activeSetupSlot.openingCash}
                          onChange={(value) => onOpeningCashChange(activeSetupSlot.key, value)}
                          placeholder="0"
                        />
                      </FormField>
                    )}
                  </div>
                )}
                {activeSetupSlot.readOnly ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnlyStaffList
                      title="Cashiers"
                      ids={activeSetupSlot.cashiers}
                      nameById={nameById}
                    />
                    <ReadOnlyStaffList
                      title="Inventory staff"
                      ids={activeSetupSlot.inventoryStaff}
                      nameById={nameById}
                    />
                  </div>
                ) : (
                  <div className={`grid gap-3 ${needsIs ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                    <StaffPicker
                      title="Cashiers"
                      required
                      employees={setupCashiers}
                      selectedIds={activeSetupSlot.cashiers}
                      maxTotal={MAX_EMPLOYEES_PER_SHIFT}
                      currentTotal={activeTotal}
                      onToggle={(id, checked) =>
                        onToggleSelection(activeSetupSlot.key, 'CASHIER', id, checked)
                      }
                    />
                    {(needsIs || activeSetupSlot.inventoryStaff.length > 0) && (
                      <StaffPicker
                        title="Inventory staff"
                        required={needsIs}
                        employees={setupInventory}
                        selectedIds={activeSetupSlot.inventoryStaff}
                        maxTotal={MAX_EMPLOYEES_PER_SHIFT}
                        currentTotal={activeTotal}
                        onToggle={(id, checked) =>
                          onToggleSelection(activeSetupSlot.key, 'INVENTORY_STAFF', id, checked)
                        }
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function ReadOnlyStaffList({ title, ids, nameById }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)]">
      <div className="border-b border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2 text-sm font-semibold">
        {title}
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto p-2 text-sm">
        {ids.length === 0 ? (
          <li className="px-1 py-2 text-[var(--admin-muted)]">None</li>
        ) : (
          ids.map((id) => (
            <li key={id} className="rounded-md px-2 py-1.5 font-medium text-[var(--admin-text)]">
              {nameById.get(id)?.fullName || `#${id}`}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
