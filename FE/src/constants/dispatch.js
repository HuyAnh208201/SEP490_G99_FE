/**
 * Dispatch constants — status machine, badges, permissions.
 * The backend returns statuses in uppercase (PREPARING/DELIVERING/REDELIVERY/RECEIVED).
 */

export const DISPATCH_STATUS = {
  PREPARING: 'preparing',
  DELIVERING: 'delivering',
  REDELIVERY: 'redelivery',
  RECEIVED: 'received',
};

export const DISPATCH_STATUS_META = {
  [DISPATCH_STATUS.PREPARING]: {
    label: 'Preparing',
    display: 'PREPARING',
    tone: 'warning',
  },
  [DISPATCH_STATUS.DELIVERING]: {
    label: 'Delivering',
    display: 'DELIVERING',
    tone: 'brand',
  },
  [DISPATCH_STATUS.REDELIVERY]: {
    label: 'Redelivery',
    display: 'REDELIVERY',
    tone: 'danger',
  },
  [DISPATCH_STATUS.RECEIVED]: {
    label: 'Delivered',
    display: 'RECEIVED',
    tone: 'success',
  },
};

/** Warehouse statuses selectable in the dropdown (excludes RECEIVED). */
export const WAREHOUSE_DISPATCH_STATUS_OPTIONS = [
  DISPATCH_STATUS.PREPARING,
  DISPATCH_STATUS.DELIVERING,
  DISPATCH_STATUS.REDELIVERY,
].map((value) => ({
  value,
  label: DISPATCH_STATUS_META[value].label,
}));

export const DISPATCH_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.values(DISPATCH_STATUS).map((value) => ({
    value,
    label: DISPATCH_STATUS_META[value].label,
  })),
];

export function normalizeDispatchStatus(status) {
  if (!status) return '';
  return String(status).toLowerCase();
}

export function dispatchStatusMeta(status) {
  const key = normalizeDispatchStatus(status);
  return (
    DISPATCH_STATUS_META[key] || {
      label: status || '—',
      display: (status || '—').toUpperCase(),
      tone: 'default',
    }
  );
}

/** Warehouse manager manages dispatch orders. */
export function canManageDispatch(has) {
  return typeof has === 'function' && has('MANAGE_DISPATCH_ORDERS');
}

export function isWarehouseEditableStatus(status) {
  const key = normalizeDispatchStatus(status);
  return (
    key === DISPATCH_STATUS.PREPARING ||
    key === DISPATCH_STATUS.DELIVERING ||
    key === DISPATCH_STATUS.REDELIVERY
  );
}
