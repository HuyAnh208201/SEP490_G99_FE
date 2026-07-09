/** Standard retail units for convenience store / minimart catalog. */
export const PRODUCT_UNITS = [
  { value: 'cai', label: 'Piece (pcs)' },
  { value: 'chai', label: 'Bottle' },
  { value: 'lon', label: 'Can' },
  { value: 'goi', label: 'Pack' },
  { value: 'hop', label: 'Box' },
  { value: 'thung', label: 'Case' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'lit', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'bao', label: 'Sack' },
  { value: 'vi', label: 'Blister pack' },
  { value: 'tui', label: 'Bag' },
  { value: 'cuon', label: 'Roll' },
  { value: 'cai_doi', label: 'Pair' },
];

/** Map legacy / free-text unit strings to canonical slug values. */
const UNIT_ALIASES = {
  cái: 'cai',
  pcs: 'cai',
  piece: 'cai',
  chai: 'chai',
  bottle: 'chai',
  lon: 'lon',
  can: 'lon',
  gói: 'goi',
  goi: 'goi',
  pack: 'goi',
  hộp: 'hop',
  hop: 'hop',
  box: 'hop',
  thùng: 'thung',
  thung: 'thung',
  case: 'thung',
  vỉ: 'vi',
  vi: 'vi',
  túi: 'tui',
  tui: 'tui',
  bag: 'tui',
  cuộn: 'cuon',
  cuon: 'cuon',
  roll: 'cuon',
  cặp: 'cai_doi',
  cai_doi: 'cai_doi',
  pair: 'cai_doi',
};

export function normalizeUnitValue(value) {
  if (!value) return 'cai';
  const raw = String(value).trim().toLowerCase();
  if (PRODUCT_UNITS.some((u) => u.value === raw)) return raw;
  return UNIT_ALIASES[raw] || raw;
}

export function unitLabel(value) {
  const normalized = normalizeUnitValue(value);
  return PRODUCT_UNITS.find((u) => u.value === normalized)?.label || value || '—';
}
