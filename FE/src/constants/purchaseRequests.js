/**
 * Purchase request domain constants — status machine, display labels & role helpers.
 *
 * Trạng thái lưu ở BE dạng lowercase (draft/pending/approved/received/rejected/cancelled),
 * FE hiển thị uppercase như wireframe.
 */

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

export function statusMeta(status) {
  return PR_STATUS_META[status] || { label: status || '—', display: status || '—', tone: 'default' };
}

/**
 * Chuẩn hoá role trả về từ PermissionsContext (đã map MANAGER→BRANCH_MANAGER, OWNER→DIRECTOR).
 */
export function normalizeRole(role) {
  if (role === 'MANAGER') return 'BRANCH_MANAGER';
  if (role === 'OWNER') return 'DIRECTOR';
  return role;
}

export const ROLE = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  INVENTORY_STAFF: 'INVENTORY_STAFF',
};

/** BM: người tạo yêu cầu nhập hàng. */
export function canCreateRequest(role) {
  return normalizeRole(role) === ROLE.BRANCH_MANAGER;
}

/** Admin / Director / Warehouse Manager: người duyệt. */
export function canApproveRequest(role) {
  return [ROLE.ADMIN, ROLE.DIRECTOR, ROLE.WAREHOUSE_MANAGER].includes(normalizeRole(role));
}

/** Inventory Staff / BM: người nhận hàng. */
export function canReceiveRequest(role) {
  return [ROLE.INVENTORY_STAFF, ROLE.BRANCH_MANAGER].includes(normalizeRole(role));
}

/** Được lọc theo chi nhánh (Admin/Director/Warehouse Manager thấy tất cả chi nhánh). */
export function canFilterByBranch(role) {
  return [ROLE.ADMIN, ROLE.DIRECTOR, ROLE.WAREHOUSE_MANAGER].includes(normalizeRole(role));
}
