import { memo } from 'react';
import Badge from '../../../components/ui/Badge.jsx';
import Card from '../../../components/ui/Card.jsx';
import { formatVnd } from '../../../lib/money.js';
import {
  CELL_STYLES,
  MAX_EMPLOYEES_PER_SHIFT,
  cellState,
  roleLabel,
  staffingMissing,
} from './shiftGrid.js';

function ScheduleGrid({ loading, slots, weekDays, grid, busy, branchId, onAssign }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[#f7f9fb] text-xs font-semibold uppercase tracking-wide text-[var(--admin-subtle)]">
            <tr>
              <th className="sticky left-0 z-10 bg-[#f7f9fb] px-3 py-2">Slot</th>
              {weekDays.map((day) => (
                <th key={day.date} className="min-w-[9.5rem] px-2 py-2 text-center">
                  <div>{day.label}</div>
                  <div className="font-normal normal-case text-[var(--admin-muted)]">
                    {day.date.slice(5)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                  Loading schedule…
                </td>
              </tr>
            ) : slots.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                  No slots for this branch&apos;s operating hours.
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.key} className="border-t border-[var(--admin-border)] align-top">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-text)]">
                    <div>{slot.label}</div>
                    {(slot.isFirst || slot.isLast) && (
                      <div className="mt-0.5 font-normal text-[var(--admin-subtle)]">
                        {slot.isFirst && slot.isLast
                          ? 'Open + close (IS)'
                          : slot.isFirst
                            ? 'Open (IS)'
                            : 'Close (IS)'}
                      </div>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const shift = grid[`${day.date}|${slot.key}`];
                    const state = cellState(shift, slot);
                    const missing = shift ? staffingMissing(shift, slot) : [];
                    const published = shift?.status === 'PUBLISHED';
                    const staff = (shift?.assignedEmployees || []).filter(Boolean);
                    return (
                      <td key={day.date} className="border-l border-[var(--admin-border)] p-1.5">
                        <button
                          type="button"
                          disabled={!!busy || !branchId || published}
                          onClick={() => onAssign(day.date, slot)}
                          className={`flex w-full min-h-[4.5rem] flex-col items-stretch gap-1 rounded-lg px-2 py-2 text-left transition ${CELL_STYLES[state]} ${
                            published ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {state === 'empty' ? (
                            <span className="m-auto text-xs font-medium">Assign</span>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-1">
                                {published ? (
                                  <Badge tone="success">Published</Badge>
                                ) : state === 'incomplete' ? (
                                  <Badge tone="warning">Incomplete</Badge>
                                ) : (
                                  <Badge tone="default">Draft</Badge>
                                )}
                                <span className="text-[10px] text-[var(--admin-subtle)]">
                                  {staff.length}/{MAX_EMPLOYEES_PER_SHIFT}
                                </span>
                              </div>
                              {slot.isFirst && (
                                <p className="text-[10px] tabular-nums text-[var(--admin-subtle)]">
                                  Float {formatVnd(shift.openingCash)}
                                </p>
                              )}
                              <ul className="space-y-0.5 text-xs text-[var(--admin-text)]">
                                {staff.map((e) => (
                                  <li key={e.employeeId || e.assignmentId}>
                                    <span className="font-medium">{e.fullName}</span>
                                    <span className="text-[var(--admin-subtle)]">
                                      {' '}
                                      · {roleLabel(e.role)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {missing.length > 0 && (
                                <p className="text-[10px] font-medium text-amber-800">
                                  Needs {missing.join(' + ')}
                                </p>
                              )}
                              {!published && (
                                <span className="text-[10px] font-medium text-[#0058be]">Edit</span>
                              )}
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default memo(ScheduleGrid);
