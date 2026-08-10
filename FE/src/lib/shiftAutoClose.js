/**
 * Matches BE shift.auto-close.grace-minutes (default 30).
 * Sessions still OPEN/CLOSING after shift.endTime + this many minutes are auto-closed.
 */
export const SHIFT_AUTO_CLOSE_GRACE_MINUTES = 30;

function parseShiftEnd(session) {
  const raw = session?.shift?.endTime;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Instant when the system will auto-close this session (end + grace). */
export function getAutoCloseDeadline(session) {
  const end = parseShiftEnd(session);
  if (!end) return null;
  return new Date(end.getTime() + SHIFT_AUTO_CLOSE_GRACE_MINUTES * 60_000);
}

/**
 * @returns {{ state: 'ok'|'warning'|'critical'|'overdue', deadline: Date, minutesLeft: number } | null}
 */
export function getAutoCloseStatus(session, now = new Date()) {
  const deadline = getAutoCloseDeadline(session);
  if (!deadline) return null;
  const msLeft = deadline.getTime() - now.getTime();
  const minutesLeft = Math.ceil(msLeft / 60_000);
  if (msLeft <= 0) {
    return { state: 'overdue', deadline, minutesLeft: 0 };
  }
  if (minutesLeft <= 10) {
    return { state: 'critical', deadline, minutesLeft };
  }
  if (minutesLeft <= SHIFT_AUTO_CLOSE_GRACE_MINUTES) {
    return { state: 'warning', deadline, minutesLeft };
  }
  return { state: 'ok', deadline, minutesLeft };
}
