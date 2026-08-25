/** Parse user-facing VND input (supports 12.500, 12500, 12.500,50). */
export function parseMoneyInput(raw) {
  if (raw == null || raw === '') return null;
  const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/**
 * Convenience for VND: small whole numbers are treated as thousands.
 * e.g. typing "50" on blur becomes 50_000 ₫.
 */
export function normalizeVndInput(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return value;
  if (Number.isInteger(num) && num > 0 && num < 1000) return num * 1000;
  return num;
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

/** Catalog reference import price per base retail unit (e.g. Bottle). */
export function baseUnitCost(row) {
  if (!row) return null;
  const n = Number(row.unitCost ?? row.referenceImportPrice);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** How many base units one TOP / import packaging unit contains. */
export function importConversionQty(row) {
  if (!row) return 1;
  const n = Number(row.unitsPerImportUnit ?? row.topPackagingConversionQty);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Cost of one TOP packaging unit (case/pack) = base unit cost × conversion. */
export function importUnitCost(row) {
  const base = baseUnitCost(row);
  if (base == null) return null;
  return base * importConversionQty(row);
}

/** Line total for a request qty expressed in TOP packaging units. */
export function lineImportCost(row, qty) {
  const unit = importUnitCost(row);
  if (unit == null) return 0;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return 0;
  return unit * q;
}
