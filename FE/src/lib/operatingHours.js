const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const HOUR_PRESETS = [
  { label: '06:00 – 22:00', open: '06:00', close: '22:00' },
  { label: '07:00 – 21:00', open: '07:00', close: '21:00' },
  { label: '08:00 – 22:00', open: '08:00', close: '22:00' },
  { label: '24/7 (00:00 – 23:59)', open: '00:00', close: '23:59' },
];

export function isValidTime(value) {
  return TIME_RE.test(value || '');
}

export function formatOperatingHours(open, close) {
  if (!isValidTime(open) || !isValidTime(close)) return '';
  return `${open} - ${close}`;
}

export function parseOperatingHours(value) {
  if (!value || typeof value !== 'string') {
    return { open: '08:00', close: '22:00' };
  }
  const trimmed = value.trim();
  if (/24\s*\/\s*7/i.test(trimmed)) {
    return { open: '00:00', close: '23:59' };
  }
  const match = trimmed.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return { open: '08:00', close: '22:00' };
  const open = match[1].padStart(5, '0');
  const close = match[2].padStart(5, '0');
  return {
    open: isValidTime(open) ? open : '08:00',
    close: isValidTime(close) ? close : '22:00',
  };
}

export function validateOperatingHours(open, close) {
  if (!isValidTime(open) || !isValidTime(close)) {
    return 'Select valid opening and closing times (HH:MM).';
  }
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  if (closeMins <= openMins && !(open === '00:00' && close === '23:59')) {
    return 'Closing time must be after opening time (or use 24/7 preset).';
  }
  return '';
}

/** Max shift length for part-time-friendly scheduling (hours). */
export const MAX_SHIFT_HOURS = 6;

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Split branch open→close into equal same-day slots, each ≤ MAX_SHIFT_HOURS.
 * @returns {{ key: string, label: string, start: string, end: string, index: number, isFirst: boolean, isLast: boolean }[]}
 */
export function deriveShiftSlots(open, close, maxHours = MAX_SHIFT_HOURS) {
  const parsed = typeof open === 'string' && close == null ? parseOperatingHours(open) : { open, close };
  const openStr = parsed.open || '08:00';
  const closeStr = parsed.close || '22:00';
  const openMins = timeToMinutes(openStr);
  let closeMins = timeToMinutes(closeStr);
  if (closeMins <= openMins) {
    // No overnight: treat invalid/overnight as a single short window ending next minute past open, or 24/7 day.
    if (openStr === '00:00' && closeStr === '23:59') {
      closeMins = 23 * 60 + 59;
    } else {
      closeMins = openMins + Math.min(maxHours * 60, 60);
    }
  }
  const durationMins = Math.max(1, closeMins - openMins);
  const slotCount = Math.max(1, Math.ceil(durationMins / (maxHours * 60)));
  const slotLength = durationMins / slotCount;
  const slots = [];
  for (let i = 0; i < slotCount; i += 1) {
    const startMins = openMins + Math.round(slotLength * i);
    const endMins = i === slotCount - 1 ? closeMins : openMins + Math.round(slotLength * (i + 1));
    const start = minutesToTime(startMins);
    const end = minutesToTime(endMins);
    slots.push({
      key: `slot-${i}-${start}-${end}`,
      label: `${start} – ${end}`,
      start,
      end,
      index: i,
      isFirst: i === 0,
      isLast: i === slotCount - 1,
    });
  }
  return slots;
}
