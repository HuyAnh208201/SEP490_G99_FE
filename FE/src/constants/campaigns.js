import { PRODUCT_UNITS, unitLabel } from './productUnits.js';

export const CAMPAIGN_TYPES = [
  { value: 'PERCENT', label: 'Percentage off' },
  { value: 'FIXED_AMOUNT', label: 'Fixed discount' },
];

export const CAMPAIGN_SCOPES = [
  { value: 'CHAIN', label: 'Entire chain' },
  { value: 'BRANCH', label: 'Single branch' },
];

/** Director/Admin: all branches vs pick specific branches (both use CHAIN scope on BE). */
export const CHAIN_SCOPE_MODES = [
  { value: 'ALL', label: 'Entire chain' },
  { value: 'SUBSET', label: 'Specific branches' },
];

export const CAMPAIGN_STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  SCHEDULED: 'Scheduled',
  EXPIRED: 'Expired',
  SUSPENDED: 'Deactivated',
  DEACTIVATED: 'Deactivated',
};

export const CAMPAIGN_STATUS_TONE = {
  DRAFT: 'warning',
  ACTIVE: 'success',
  SCHEDULED: 'brand',
  EXPIRED: 'warning',
  SUSPENDED: 'danger',
  DEACTIVATED: 'default',
};

export const CAMPAIGN_STATUS_FILTERS = [
  { id: 'all', label: 'All statuses' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'DEACTIVATED', label: 'Deactivated' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SUSPENDED', label: 'Deactivated' },
];

/**
 * Display status aligned with mobile visibility:
 * ACTIVE + past end → Expired; ACTIVE + future start → Scheduled;
 * DEACTIVATED/SUSPENDED with past end → Expired.
 */
export function getEffectiveStatus(campaign) {
  if (!campaign?.status) return campaign?.status;
  const status = campaign.status;
  const now = Date.now();
  const startMs = campaign.startAt ? new Date(campaign.startAt).getTime() : null;
  const endMs = campaign.endAt ? new Date(campaign.endAt).getTime() : null;

  if (status === 'ACTIVE') {
    if (endMs != null && Number.isFinite(endMs) && endMs < now) return 'EXPIRED';
    if (startMs != null && Number.isFinite(startMs) && startMs > now) return 'SCHEDULED';
    return 'ACTIVE';
  }
  if (
    (status === 'DEACTIVATED' || status === 'SUSPENDED') &&
    endMs != null &&
    Number.isFinite(endMs) &&
    endMs < now
  ) {
    return 'EXPIRED';
  }
  return status;
}

export const CREATOR_FILTERS = [
  { id: 'all', label: 'All creators' },
  { id: 'chain', label: 'Director / Admin' },
  { id: 'branch', label: 'Branch manager' },
];

export function formatCampaignType(type) {
  if (type === 'BUY_X_GET_Y') return 'Buy X get Y (retired)';
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
    const unit = conditions?.unit ? unitLabel(conditions.unit) : '';
    if (buy && get) {
      const base = `Buy ${buy} get ${get}`;
      return unit ? `${base} (${unit})` : base;
    }
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
      const cond = { buyQuantity, getQuantity };
      if (form.categoryId) cond.categoryId = Number(form.categoryId);
      if (form.unit) cond.unit = form.unit;
      return cond;
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
    return { minOrderAmount: '', buyQuantity: '', getQuantity: '', categoryId: '', unit: 'cai' };
  }
  return {
    minOrderAmount: conditions.minOrderAmount ?? '',
    buyQuantity: conditions.buyQuantity ?? conditions.buyQty ?? '',
    getQuantity: conditions.getQuantity ?? conditions.getQty ?? '',
    categoryId: conditions.categoryId != null ? String(conditions.categoryId) : '',
    unit: conditions.unit ?? 'cai',
  };
}
