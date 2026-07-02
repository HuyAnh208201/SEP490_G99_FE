/** Parse user-facing VND input (supports 12.500, 12500, 12.500,50). */
export function parseMoneyInput(raw) {
  if (raw == null || raw === '') return null;
  const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Format number as Vietnamese currency display (no symbol). */
export function formatMoneyInput(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatVnd(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
}
