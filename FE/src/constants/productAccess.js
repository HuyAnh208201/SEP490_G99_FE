import { normalizeWebRole } from './userRoles.js';

/** BM = Branch Manager */
/** IS = Inventory Staff */
/** WM = Warehouse Manager */

export function isBranchStoreRole(role) {
  const web = normalizeWebRole(role);
  return web === 'BRANCH_MANAGER' || web === 'INVENTORY_STAFF';
}

export function isCentralCatalogRole(role) {
  const web = normalizeWebRole(role);
  return web === 'ADMIN' || web === 'DIRECTOR';
}

export function isWarehouseViewRole(role) {
  return normalizeWebRole(role) === 'WAREHOUSE_MANAGER';
}

export function canManageProducts(role, permissions) {
  const web = normalizeWebRole(role);
  if (web === 'WAREHOUSE_MANAGER' || web === 'BRANCH_MANAGER' || web === 'INVENTORY_STAFF') {
    return false;
  }
  return permissions?.has?.('PRODUCT_MANAGEMENT');
}

export function canViewProducts(role, permissions) {
  if (canManageProducts(role, permissions)) return true;
  if (permissions?.has?.('PRODUCT_VIEW')) return true;
  return isBranchStoreRole(role);
}

export function showBarcodeWorkflow(role) {
  return isBranchStoreRole(role);
}

export function showBranchStockColumn(role) {
  return isBranchStoreRole(role);
}

/** BM can edit branch_inventory.reorder_point for their store. */
export function canEditBranchReorderPoint(role) {
  return normalizeWebRole(role) === 'BRANCH_MANAGER';
}

export function showWarehouseStockColumn(role) {
  return isWarehouseViewRole(role);
}

export function showInventoryCountAction(role, permissions) {
  return isBranchStoreRole(role) && permissions?.has?.('INVENTORY_COUNT');
}
