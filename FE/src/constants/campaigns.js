export const CAMPAIGN_TYPES = [
  { value: 'PERCENT', label: 'Percentage off' },
  { value: 'FIXED_AMOUNT', label: 'Fixed discount' },
  { value: 'BUY_X_GET_Y', label: 'Buy X get Y' },
];

export const CAMPAIGN_SCOPES = [
  { value: 'CHAIN', label: 'Entire chain' },
  { value: 'BRANCH', label: 'Single branch' },
];

export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
};

export const CAMPAIGN_STATUS_TONE = {
  DRAFT: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
};

export function formatCampaignType(type) {
  return CAMPAIGN_TYPES.find((t) => t.value === type)?.label || type;
}

export function formatDiscount(campaign) {
  if (!campaign) return '—';
  const { type, discountValue, conditions } = campaign;
  if (type === 'PERCENT') return `${discountValue}%`;
  if (type === 'FIXED_AMOUNT') {
    const n = Number(discountValue);
    return Number.isFinite(n) ? `${n.toLocaleString('vi-VN')} ₫` : `${discountValue} ₫`;
  }
  if (type === 'BUY_X_GET_Y') {
    const buy = conditions?.buyQuantity ?? conditions?.buyQty;
    const get = conditions?.getQuantity ?? conditions?.getQty;
    if (buy && get) return `Buy ${buy} get ${get}`;
    return `Value: ${discountValue}`;
  }
  return String(discountValue ?? '—');
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 16);
}

export function toApiDateTime(localValue) {
  if (!localValue) return null;
  return localValue.length === 16 ? `${localValue}:00` : localValue;
}

export function buildConditions(type, form) {
  if (type === 'BUY_X_GET_Y') {
    const buyQuantity = Number(form.buyQuantity);
    const getQuantity = Number(form.getQuantity);
    if (buyQuantity > 0 && getQuantity > 0) {
      return { buyQuantity, getQuantity };
    }
    return null;
  }
  const minOrderAmount = parseFloat(form.minOrderAmount);
  if (Number.isFinite(minOrderAmount) && minOrderAmount > 0) {
    return { minOrderAmount };
  }
  return null;
}

export function parseConditionsToForm(conditions) {
  if (!conditions || typeof conditions !== 'object') {
    return { minOrderAmount: '', buyQuantity: '', getQuantity: '' };
  }
  return {
    minOrderAmount: conditions.minOrderAmount ?? '',
    buyQuantity: conditions.buyQuantity ?? conditions.buyQty ?? '',
    getQuantity: conditions.getQuantity ?? conditions.getQty ?? '',
  };
}
