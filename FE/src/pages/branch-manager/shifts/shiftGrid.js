export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MAX_EMPLOYEES_PER_SHIFT = 3;

export const CELL_STYLES = {
  empty:
    'border border-dashed border-[var(--admin-border)] bg-white text-[var(--admin-muted)] hover:border-[#0058be]/50 hover:text-[#0058be]',
  incomplete: 'border border-amber-300 bg-amber-50/70',
  ready: 'border border-[#0058be]/35 bg-[#eef4fc]',
  published: 'border border-emerald-300 bg-emerald-50/60',
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Format a Date as local YYYY-MM-DD (never use toISOString — UTC drift). */
export function toLocalDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Monday of the week containing dateStr (or today). Always local noon-anchored. */
export function mondayOf(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  if (!dateStr) d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

/** YYYY-MM-DD → DD/MM/YYYY */
export function toDdMmYyyy(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY (or D/M/YYYY) → YYYY-MM-DD, or null if invalid */
export function fromDdMmYyyy(display) {
  const match = String(display || '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${pad2(month)}-${pad2(day)}`;
  const check = new Date(`${iso}T12:00:00`);
  if (
    Number.isNaN(check.getTime()) ||
    check.getFullYear() !== year ||
    check.getMonth() + 1 !== month ||
    check.getDate() !== day
  ) {
    return null;
  }
  return iso;
}

export function localIso(dateStr, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${dateStr}T${pad2(h)}:${pad2(m)}:00`;
}

export function timeOf(iso) {
  if (!iso) return '';
  const match = String(iso).match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function dateOf(iso) {
  if (!iso) return '';
  const match = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return toLocalDateStr(d);
}

export function roleLabel(role) {
  if (role === 'CASHIER') return 'Cashier';
  if (role === 'INVENTORY_STAFF') return 'IS';
  return role || '';
}

function hasRole(shift, role) {
  return (shift?.assignedEmployees || []).some((e) => e.role === role);
}

export function staffingMissing(shift, slot) {
  const missing = [];
  if (!hasRole(shift, 'CASHIER')) missing.push('Cashier');
  if ((slot.isFirst || slot.isLast) && !hasRole(shift, 'INVENTORY_STAFF')) missing.push('IS');
  return missing;
}

export function cellState(shift, slot) {
  if (!shift) return 'empty';
  if (shift.status === 'PUBLISHED') return 'published';
  if (shift.status === 'CANCELLED') return 'empty';
  const assigned = (shift.assignedEmployees || []).length;
  if (assigned === 0) return 'empty';
  if (assigned > MAX_EMPLOYEES_PER_SHIFT) return 'incomplete';
  if (staffingMissing(shift, slot).length) return 'incomplete';
  return 'ready';
}

export function slotStaffingIssues(cashiers, inventoryStaff, isFirst, isLast) {
  const total = cashiers.length + inventoryStaff.length;
  const missing = [];
  if (total < 1) missing.push('staff');
  if (cashiers.length < 1) missing.push('Cashier');
  if ((isFirst || isLast) && inventoryStaff.length < 1) missing.push('IS');
  if (total > MAX_EMPLOYEES_PER_SHIFT) missing.push('max 3');
  return missing;
}

export function buildWeekDays(weekStart) {
  return DAY_LABELS.map((label, i) => ({ label, date: addDays(weekStart, i) }));
}
