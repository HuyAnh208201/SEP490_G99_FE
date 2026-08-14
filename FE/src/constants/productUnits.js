/** English retail units for POS and branch inventory. */
export const PRODUCT_UNITS = [
  { value: 'piece', label: 'Piece (pcs)' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'cup', label: 'Cup' },
  { value: 'tub', label: 'Tub' },
  { value: 'tray', label: 'Tray' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'bag', label: 'Bag' },
  { value: 'blister', label: 'Blister pack' },
  { value: 'card', label: 'Card' },
  { value: 'roll', label: 'Roll' },
  { value: 'pair', label: 'Pair' },
  { value: 'serving', label: 'Serving' },
  { value: 'set', label: 'Set' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
];

/** Wholesale / import units used when BM requests replenishment. */
export const PURCHASE_UNITS = [
  { value: 'case', label: 'Case' },
  { value: 'carton', label: 'Carton' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'bag', label: 'Bag' },
  { value: 'tray', label: 'Tray' },
  { value: 'crate', label: 'Crate' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'lot', label: 'Lot' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'sack', label: 'Sack' },
];

const UNIT_ALIASES = {
  cai: 'piece',
  cái: 'piece',
  pcs: 'piece',
  piece: 'piece',
  chai: 'bottle',
  bottle: 'bottle',
  lon: 'can',
  can: 'can',
  goi: 'pack',
  gói: 'pack',
  cup: 'cup',
  ly: 'cup',
  tub: 'tub',
  tray: 'tray',
  khay: 'tray',
  card: 'card',
  the: 'card',
  thẻ: 'card',
  serving: 'serving',
  phan: 'serving',
  phần: 'serving',
  set: 'set',
  bo: 'set',
  bộ: 'set',
  hop: 'box',
  hộp: 'box',
  box: 'box',
  thung: 'case',
  thùng: 'case',
  case: 'case',
  vi: 'blister',
  vỉ: 'blister',
  blister: 'blister',
  tui: 'bag',
  túi: 'bag',
  bag: 'bag',
  cuon: 'roll',
  cuộn: 'roll',
  roll: 'roll',
  cai_doi: 'pair',
  cặp: 'pair',
  pair: 'pair',
  lit: 'liter',
  liter: 'liter',
  gram: 'gram',
  bao: 'sack',
  sack: 'sack',
  carton: 'carton',
  crate: 'crate',
  pallet: 'pallet',
  lot: 'lot',
  bundle: 'bundle',
};

export function normalizeUnitValue(value) {
  if (!value) return 'piece';
  const raw = String(value).trim().toLowerCase();
  if (PRODUCT_UNITS.some((u) => u.value === raw)) return raw;
  if (PURCHASE_UNITS.some((u) => u.value === raw)) return raw;
  return UNIT_ALIASES[raw] || raw;
}

export function unitLabel(value) {
  const normalized = normalizeUnitValue(value);
  return (
    PRODUCT_UNITS.find((u) => u.value === normalized)?.label ||
    PURCHASE_UNITS.find((u) => u.value === normalized)?.label ||
    value ||
    '—'
  );
}

export function purchaseUnitLabel(value) {
  const normalized = normalizeUnitValue(value);
  return PURCHASE_UNITS.find((u) => u.value === normalized)?.label || unitLabel(value);
}

export function defaultImportUnitForRetail(retailUnit) {
  const unit = normalizeUnitValue(retailUnit);
  switch (unit) {
    case 'can':
    case 'bottle':
      return { importUnit: 'case', unitsPerImportUnit: 24 };
    case 'pack':
      return { importUnit: 'carton', unitsPerImportUnit: 30 };
    case 'box':
      return { importUnit: 'carton', unitsPerImportUnit: 12 };
    case 'piece':
      return { importUnit: 'carton', unitsPerImportUnit: 20 };
    case 'cup':
    case 'tub':
    case 'tray':
    case 'card':
    case 'serving':
    case 'set':
      return { importUnit: 'carton', unitsPerImportUnit: 12 };
    default:
      return { importUnit: 'case', unitsPerImportUnit: 24 };
  }
}
