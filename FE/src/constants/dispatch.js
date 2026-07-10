/**
 * Dispatch (lô vận chuyển) constants — status machine, badges, vehicle options, permissions.
 * BE trả status uppercase (PREPARING/DELIVERING/RECEIVED).
 */

export const DISPATCH_STATUS = {
  PREPARING: 'preparing',
  DELIVERING: 'delivering',
  RECEIVED: 'received',
};

export const DISPATCH_STATUS_META = {
  [DISPATCH_STATUS.PREPARING]: { label: 'Preparing', display: 'PREPARING', tone: 'warning' },
  [DISPATCH_STATUS.DELIVERING]: { label: 'Delivering', display: 'DELIVERING', tone: 'brand' },
  [DISPATCH_STATUS.RECEIVED]: { label: 'Received', display: 'RECEIVED', tone: 'success' },
};

export const DISPATCH_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.values(DISPATCH_STATUS).map((value) => ({
    value,
    label: DISPATCH_STATUS_META[value].label,
  })),
];

/** Vehicle options for a dispatch order. */
export const VEHICLE_OPTIONS = [
  'Small Van',
  'Refrigerated Van',
  '6-Wheel Truck',
  'Motorbike',
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

/** Next status in the delivery lifecycle, or null if terminal. */
export function nextDispatchStatus(status) {
  const key = normalizeDispatchStatus(status);
  if (key === DISPATCH_STATUS.PREPARING) return DISPATCH_STATUS.DELIVERING;
  if (key === DISPATCH_STATUS.DELIVERING) return DISPATCH_STATUS.RECEIVED;
  return null;
}

/** Warehouse manager manages dispatch orders. */
export function canManageDispatch(has) {
  return typeof has === 'function' && has('MANAGE_DISPATCH_ORDERS');
}
