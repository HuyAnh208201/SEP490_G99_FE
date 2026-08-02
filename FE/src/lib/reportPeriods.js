/** Local YYYY-MM-DD (avoids UTC shift from toISOString). */
export function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateInput(value) {
  if (!value) return new Date();
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(d) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function quarterBounds(year, quarter) {
  const q = Math.min(4, Math.max(1, Number(quarter) || 1));
  const from = new Date(year, (q - 1) * 3, 1);
  const to = new Date(year, q * 3, 0);
  return { from: toDateInput(from), to: toDateInput(to), quarter: q, year };
}

export function rangeForPeriod(period, anchor = new Date()) {
  if (period === 'month') {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    return { from: toDateInput(start), to: toDateInput(end) };
  }
  if (period === 'week') {
    return { from: toDateInput(startOfWeek(anchor)), to: toDateInput(endOfWeek(anchor)) };
  }
  return null;
}

export function shiftAnchor(period, anchor, delta) {
  const d = new Date(anchor);
  if (period === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else if (period === 'month') {
    d.setMonth(d.getMonth() + delta);
  }
  return d;
}

export function formatPeriodLabel(period, from, to, anchor) {
  if (period === 'week') {
    const start = startOfWeek(anchor || parseDateInput(from));
    const end = endOfWeek(start);
    return `Week ${toDateInput(start).slice(5)} → ${toDateInput(end).slice(5)}`;
  }
  if (period === 'month') {
    const d = anchor || parseDateInput(from);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }
  if (from && to) return `${from} → ${to}`;
  return 'Custom range';
}
