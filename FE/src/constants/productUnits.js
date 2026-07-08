/** Standard retail units for convenience store / minimart catalog. */
export const PRODUCT_UNITS = [
  { value: 'cai', label: 'Cái (pcs)' },
  { value: 'chai', label: 'Chai' },
  { value: 'lon', label: 'Lon' },
  { value: 'goi', label: 'Gói' },
  { value: 'hop', label: 'Hộp' },
  { value: 'thung', label: 'Thùng' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'lit', label: 'Lít (L)' },
  { value: 'ml', label: 'Mililit (ml)' },
  { value: 'bao', label: 'Bao' },
  { value: 'vi', label: 'Vỉ' },
  { value: 'tui', label: 'Túi' },
  { value: 'cuon', label: 'Cuộn' },
  { value: 'cai_doi', label: 'Cặp' },
];

/** Map legacy / free-text unit strings to canonical slug values. */
const UNIT_ALIASES = {
  cái: 'cai',
  pcs: 'cai',
  chai: 'chai',
  lon: 'lon',
  gói: 'goi',
  goi: 'goi',
  hộp: 'hop',
  hop: 'hop',
  thùng: 'thung',
  thung: 'thung',
  vỉ: 'vi',
  vi: 'vi',
  túi: 'tui',
  tui: 'tui',
  cuộn: 'cuon',
  cuon: 'cuon',
  cặp: 'cai_doi',
  cai_doi: 'cai_doi',
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
