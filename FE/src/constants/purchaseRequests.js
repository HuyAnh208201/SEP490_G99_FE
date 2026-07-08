/**
 * Purchase request domain constants — status machine, display labels & permission helpers.
 *
 * Trạng thái lưu ở BE dạng lowercase (draft/pending/approved/received/rejected/cancelled).
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
  [PR_STATUS.DRAFT]: { label: 'Nháp', display: 'NHÁP', tone: 'default' },
  [PR_STATUS.PENDING]: { label: 'Chờ duyệt', display: 'CHỜ DUYỆT', tone: 'warning' },
  [PR_STATUS.APPROVED]: { label: 'Đã duyệt', display: 'ĐÃ DUYỆT', tone: 'brand' },
  [PR_STATUS.RECEIVED]: { label: 'Đã nhận', display: 'ĐÃ NHẬN', tone: 'success' },
  [PR_STATUS.REJECTED]: { label: 'Từ chối', display: 'TỪ CHỐI', tone: 'danger' },
  [PR_STATUS.CANCELLED]: { label: 'Đã hủy', display: 'ĐÃ HỦY', tone: 'default' },
};

export const PR_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  ...Object.values(PR_STATUS).map((value) => ({
    value,
    label: PR_STATUS_META[value].label,
  })),
];

export function statusMeta(status) {
  return PR_STATUS_META[status] || { label: status || '—', display: status || '—', tone: 'default' };
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

/** BM: người tạo yêu cầu nhập hàng. */
export function canCreateRequest(has) {
  return typeof has === 'function' && has('CREATE_IMPORT_REQUEST');
}

/** Kho tổng / Admin / Director: người duyệt. */
export function canApproveRequest(has) {
  return typeof has === 'function' && has('APPROVE_IMPORT_REQUEST');
}

/** Nhân viên kho chi nhánh: người nhận hàng. */
export function canReceiveRequest(has) {
  return typeof has === 'function' && has('SUPPLY_IMPORT_RECEIPT_APPROVE');
}

/** Được lọc theo chi nhánh (xem tất cả chi nhánh). */
export function canFilterByBranch(has) {
  if (typeof has !== 'function') return false;
  return has('APPROVE_IMPORT_REQUEST') || has('MANAGE_BRANCH_IMPORT_REQUESTS');
}

/** Consolidated / gom đơn — kho tổng hoặc người duyệt. */
export function canViewConsolidatedImports(has) {
  if (typeof has !== 'function') return false;
  return has('APPROVE_IMPORT_REQUEST') || has('MANAGE_BRANCH_IMPORT_REQUESTS');
}

/** Có quyền truy cập module nhập hàng. */
export function canAccessPurchaseRequests(has) {
  if (typeof has !== 'function') return false;
  return (
    has('CREATE_IMPORT_REQUEST') ||
    has('APPROVE_IMPORT_REQUEST') ||
    has('MANAGE_BRANCH_IMPORT_REQUESTS') ||
    has('SUPPLY_IMPORT_RECEIPT_APPROVE')
  );
}
