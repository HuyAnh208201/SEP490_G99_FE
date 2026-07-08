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
