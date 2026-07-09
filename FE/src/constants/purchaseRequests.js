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
  RECEIVED: 'received',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

/** Display labels + badge tone for each status. */
export const PR_STATUS_META = {
  [PR_STATUS.DRAFT]: { label: 'Draft', display: 'DRAFT', tone: 'default' },
  [PR_STATUS.PENDING]: { label: 'Pending', display: 'PENDING', tone: 'warning' },
  [PR_STATUS.APPROVED]: { label: 'Approved', display: 'APPROVED', tone: 'brand' },
  [PR_STATUS.RECEIVED]: { label: 'Received', display: 'RECEIVED', tone: 'success' },
  [PR_STATUS.REJECTED]: { label: 'Rejected', display: 'REJECTED', tone: 'danger' },
  [PR_STATUS.CANCELLED]: { label: 'Cancelled', display: 'CANCELLED', tone: 'default' },
};

export const PR_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.values(PR_STATUS).map((value) => ({
    value,
    label: PR_STATUS_META[value].label,
  })),
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

/** Central warehouse / Admin / Director: approves requests. */
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
