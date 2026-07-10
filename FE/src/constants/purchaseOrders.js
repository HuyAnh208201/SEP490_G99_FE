/**
 * Purchase order (đơn đặt hàng nhà cung cấp) constants — status badges & permission.
 * BE trả status uppercase (ORDERED/RECEIVED/CANCELLED).
 */

export const PO_STATUS = {
  ORDERED: 'ordered',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

export const PO_STATUS_META = {
  [PO_STATUS.ORDERED]: { label: 'Ordered', display: 'ORDERED', tone: 'warning' },
  [PO_STATUS.RECEIVED]: { label: 'Received', display: 'RECEIVED', tone: 'success' },
  [PO_STATUS.CANCELLED]: { label: 'Cancelled', display: 'CANCELLED', tone: 'danger' },
};

export const PO_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.values(PO_STATUS).map((value) => ({
    value,
    label: PO_STATUS_META[value].label,
  })),
];

export function normalizePoStatus(status) {
  if (!status) return '';
  return String(status).toLowerCase();
}

export function poStatusMeta(status) {
  const key = normalizePoStatus(status);
  return (
    PO_STATUS_META[key] || {
      label: status || '—',
      display: (status || '—').toUpperCase(),
      tone: 'default',
    }
  );
}

/** Warehouse manager places purchase orders with external suppliers. */
export function canManagePurchaseOrders(has) {
  return typeof has === 'function' && has('CHOOSE_EXTERNAL_SUPPLIER');
}
