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

export function unitLabel(value) {
  return PRODUCT_UNITS.find((u) => u.value === value)?.label || value || '—';
}
