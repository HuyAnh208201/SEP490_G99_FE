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

function isMine(staff, currentUserId) {
  if (currentUserId == null) return false;
  const id = Number(currentUserId);
  return staff.some((e) => Number(e.employeeId) === id);
}

function myAttendance(staff, currentUserId, shiftEnded) {
  if (currentUserId == null || !shiftEnded) return null;
  const id = Number(currentUserId);
  const me = staff.find((e) => Number(e.employeeId) === id);
  if (!me) return null;
  return me.checkInAt ? 'present' : 'absent';
}

function SkeletonCell() {
  return (
    <div className="min-h-[4.5rem] animate-pulse rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] px-2 py-2">
      <div className="mb-2 h-3 w-12 rounded bg-[var(--admin-border)]" />
      <div className="mb-1 h-2.5 w-full rounded bg-[var(--admin-border)]/80" />
      <div className="h-2.5 w-4/5 rounded bg-[var(--admin-border)]/60" />
    </div>
  );
}

function ScheduleGrid({
  loading,
  refreshing = false,
  slots,
  weekDays,
  grid,
  busy,
  branchId,
  onAssign,
  readOnly = false,
  currentUserId = null,
}) {
  const showSkeleton = (loading || refreshing) && slots.length > 0;
  const colSpan = weekDays.length + 1;

  return (
    <Card className="!p-0 overflow-hidden">
      <div
        className={`w-full overflow-x-auto transition-opacity duration-150 ${refreshing ? 'opacity-70' : ''}`}
        aria-busy={refreshing || undefined}
      >
        <table className="min-w-full w-full border-collapse text-left text-sm">
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
            {showSkeleton ? (
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
                  {weekDays.map((day) => (
                    <td key={day.date} className="border-l border-[var(--admin-border)] p-1.5">
                      <SkeletonCell />
                    </td>
                  ))}
                </tr>
              ))
            ) : loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-[var(--admin-muted)]">
                  Loading schedule…
                </td>
              </tr>
            ) : slots.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-[var(--admin-muted)]">
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
                    const missing = !readOnly && shift ? staffingMissing(shift, slot) : [];
                    const published = shift?.status === 'PUBLISHED';
                    const staff = (shift?.assignedEmployees || []).filter(Boolean);
                    const mine = isMine(staff, currentUserId);
                    const shiftEnded =
                      Boolean(shift?.endTime) && new Date(shift.endTime).getTime() < Date.now();
                    const attendance = readOnly ? myAttendance(staff, currentUserId, shiftEnded) : null;
                    const cellClass = [
                      CELL_STYLES[state],
                      attendance === 'present'
                        ? 'border-emerald-300 bg-emerald-50'
                        : attendance === 'absent'
                          ? 'border-rose-200 bg-rose-50'
                          : mine
                            ? 'ring-2 ring-[#0058be] ring-offset-1'
                            : '',
                      readOnly ? 'cursor-default' : published ? 'cursor-default' : 'cursor-pointer',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    const body =
                      state === 'empty' ? (
                        readOnly ? (
                          <span className="m-auto text-xs text-[var(--admin-subtle)]">—</span>
                        ) : (
                          <span className="m-auto text-xs font-medium">Assign</span>
                        )
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-1">
                            {mine && !attendance && <Badge tone="brand">You</Badge>}
                            {attendance === 'present' && <Badge tone="success">Present</Badge>}
                            {attendance === 'absent' && <Badge tone="danger">Absent</Badge>}
                            {!readOnly &&
                              (published ? (
                                <Badge tone="success">Published</Badge>
                              ) : state === 'incomplete' ? (
                                <Badge tone="warning">Incomplete</Badge>
                              ) : (
                                <Badge tone="default">Draft</Badge>
                              ))}
                            {readOnly && published && !mine && !attendance && (
                              <Badge tone="success">Published</Badge>
                            )}
                            {!readOnly && (
                              <span className="text-[10px] text-[var(--admin-subtle)]">
                                {staff.length}/{MAX_EMPLOYEES_PER_SHIFT}
                              </span>
                            )}
                          </div>
                          {slot.isFirst && !readOnly && (
                            <p className="text-[10px] tabular-nums text-[var(--admin-subtle)]">
                              Float {formatVnd(shift.openingCash)}
                            </p>
                          )}
                          <ul className="space-y-0.5 text-xs text-[var(--admin-text)]">
                            {staff.map((e) => {
                              const isMe = currentUserId != null && Number(e.employeeId) === Number(currentUserId);
                              const pastMine = readOnly && isMe && shiftEnded;
                              return (
                                <li key={e.employeeId || e.assignmentId}>
                                  <span className="font-medium">{e.fullName}</span>
                                  <span className="text-[var(--admin-subtle)]">
                                    {' '}
                                    · {roleLabel(e.role)}
                                  </span>
                                  {pastMine ? (
                                    <span
                                      className={`ml-1 text-[10px] font-semibold ${
                                        e.checkInAt ? 'text-emerald-700' : 'text-rose-700'
                                      }`}
                                    >
                                      {e.checkInAt ? '· Present' : '· Absent'}
                                    </span>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                          {missing.length > 0 && (
                            <p className="text-[10px] font-medium text-amber-800">
                              Needs {missing.join(' + ')}
                            </p>
                          )}
                          {!readOnly && !published && (
                            <span className="text-[10px] font-medium text-[#0058be]">Edit</span>
                          )}
                        </>
                      );

                    return (
                      <td key={day.date} className="border-l border-[var(--admin-border)] p-1.5">
                        {readOnly ? (
                          <div
                            className={`flex w-full min-h-[4.5rem] flex-col items-stretch gap-1 rounded-lg px-2 py-2 text-left ${cellClass}`}
                          >
                            {body}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!!busy || !branchId || published}
                            onClick={() => onAssign?.(day.date, slot)}
                            className={`flex w-full min-h-[4.5rem] flex-col items-stretch gap-1 rounded-lg px-2 py-2 text-left transition ${cellClass}`}
                          >
                            {body}
                          </button>
                        )}
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
