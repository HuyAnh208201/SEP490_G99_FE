/**
 * Constants for the branch Inventory Staff workflow (section 2.6).
 * The backend returns statuses in uppercase.
 */

// --- Order tracking / shipment status (derived from request status in the batch) ---
export const SHIPMENT_STATUS_META = {
  PREPARING: { label: 'Preparing', tone: 'warning' },
  DELIVERING: { label: 'Sent', tone: 'brand' },
  REDELIVERY: { label: 'Redelivery', tone: 'danger' },
  RECEIVED: { label: 'Received', tone: 'success' },
};

export const SHIPMENT_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'DELIVERING', label: 'Sent' },
  { value: 'REDELIVERY', label: 'Redelivery' },
  { value: 'RECEIVED', label: 'Received' },
];

export function shipmentStatusMeta(status) {
  const key = String(status || '').toUpperCase();
  return SHIPMENT_STATUS_META[key] || { label: status || '—', tone: 'default' };
}

// --- Approval status shared by Receiving History & Count History ---
export const APPROVAL_STATUS_META = {
  PENDING_APPROVAL: { label: 'Pending Approval', tone: 'warning' },
  APPROVED: { label: 'Received', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

export const APPROVAL_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'APPROVED', label: 'Received' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function approvalStatusMeta(status) {
  const key = String(status || '').toUpperCase();
  return APPROVAL_STATUS_META[key] || { label: status || '—', tone: 'default' };
}

/** Inventory staff receiving/counting permissions. */
export function canReceiveShipment(has) {
  return typeof has === 'function' && has('RECEIVE_SHIPMENT');
}

export function canInventoryCount(has) {
  return typeof has === 'function' && has('INVENTORY_COUNT');
}
