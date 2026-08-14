/**
 * Purchase request domain constants — status machine, display labels & permission helpers.
 *
 * BE returns status as uppercase enum names (DRAFT/PENDING/...); normalize before lookup.
 */
import { normalizeWebRole } from './userRoles.js';

export const PR_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  AWAITING_STOCK: 'awaiting_stock',
  DISPATCHING: 'dispatching',
  IN_TRANSIT: 'in_transit',
  RECEIVED: 'received',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

/** Display labels + badge tone for each status. */
export const PR_STATUS_META = {
  [PR_STATUS.DRAFT]: { label: 'Draft', display: 'DRAFT', tone: 'default', step: 1 },
  [PR_STATUS.PENDING]: { label: 'Pending approval', display: 'PENDING', tone: 'warning', step: 2 },
  [PR_STATUS.APPROVED]: { label: 'Approved', display: 'APPROVED', tone: 'brand', step: 3 },
  [PR_STATUS.AWAITING_STOCK]: { label: 'Awaiting stock', display: 'AWAITING STOCK', tone: 'soon', step: 3 },
  [PR_STATUS.DISPATCHING]: { label: 'Pending transport', display: 'PENDING TRANSPORT', tone: 'brand', step: 4 },
  [PR_STATUS.IN_TRANSIT]: { label: 'In transit', display: 'IN TRANSIT', tone: 'warning', step: 5 },
  [PR_STATUS.RECEIVED]: { label: 'Received', display: 'RECEIVED', tone: 'success', step: 6 },
  [PR_STATUS.REJECTED]: { label: 'Rejected', display: 'REJECTED', tone: 'danger', step: 0 },
  [PR_STATUS.CANCELLED]: { label: 'Cancelled', display: 'CANCELLED', tone: 'default', step: 0 },
};

/** Filter pills for list screens — default '' hides drafts (BE excludes DRAFT when status is empty). */
const PR_FILTER_STATUS_ORDER = [
  PR_STATUS.PENDING,
  PR_STATUS.APPROVED,
  PR_STATUS.AWAITING_STOCK,
  PR_STATUS.DISPATCHING,
  PR_STATUS.IN_TRANSIT,
  PR_STATUS.RECEIVED,
  PR_STATUS.DRAFT,
  PR_STATUS.CANCELLED,
];

export const PR_STATUS_OPTIONS = [
  { value: '', label: 'Active requests' },
  ...PR_FILTER_STATUS_ORDER.map((value) => ({
    value,
    label: PR_STATUS_META[value].label,
  })),
];

/** Warehouse Incoming Requests — pending, short-stock, and approved (ready to ship). */
export const WM_INCOMING_STATUS_OPTIONS = [
  { value: '', label: 'All incoming' },
  { value: PR_STATUS.PENDING, label: PR_STATUS_META[PR_STATUS.PENDING].label },
  { value: PR_STATUS.AWAITING_STOCK, label: PR_STATUS_META[PR_STATUS.AWAITING_STOCK].label },
  { value: PR_STATUS.APPROVED, label: PR_STATUS_META[PR_STATUS.APPROVED].label },
];

export function normalizeStatus(status) {
  if (!status) return '';
  return String(status).toLowerCase();
}

export function statusMeta(status) {
  const key = normalizeStatus(status);
  return PR_STATUS_META[key] || { label: status || '—', display: (status || '—').toUpperCase(), tone: 'default' };
}

export function normalizeRole(role) {
  return normalizeWebRole(role);
}

export const ROLE = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  INVENTORY_STAFF: 'INVENTORY_STAFF',
};

/** Branch manager: creates import requests. */
export function canCreateRequest(has) {
  return typeof has === 'function' && has('CREATE_IMPORT_REQUEST');
}

/** Warehouse Manager only: approves central import requests. */
export function canApproveRequest(has) {
  return typeof has === 'function' && has('APPROVE_IMPORT_REQUEST');
}

/** Branch inventory staff: receives goods. */
export function canReceiveRequest(has) {
  return typeof has === 'function' && has('SUPPLY_IMPORT_RECEIPT_APPROVE');
}

/** Can filter by branch (view all branches). */
export function canFilterByBranch(has) {
  if (typeof has !== 'function') return false;
  return has('APPROVE_IMPORT_REQUEST') || has('MANAGE_BRANCH_IMPORT_REQUESTS');
}

/** Consolidated view — central warehouse or approvers. */
export function canViewConsolidatedImports(has) {
  if (typeof has !== 'function') return false;
  return has('APPROVE_IMPORT_REQUEST') || has('MANAGE_BRANCH_IMPORT_REQUESTS');
}

/** Warehouse incoming requests screen (2.2) — review & approve branch requests. */
export function canManageIncomingRequests(has) {
  if (typeof has !== 'function') return false;
  return has('MANAGE_BRANCH_IMPORT_REQUESTS') || has('APPROVE_IMPORT_REQUEST');
}

/** Can access the supply import module. */
export function canAccessPurchaseRequests(has) {
  if (typeof has !== 'function') return false;
  return (
    has('CREATE_IMPORT_REQUEST') ||
    has('APPROVE_IMPORT_REQUEST') ||
    has('MANAGE_BRANCH_IMPORT_REQUESTS') ||
    has('SUPPLY_IMPORT_RECEIPT_APPROVE')
  );
}
