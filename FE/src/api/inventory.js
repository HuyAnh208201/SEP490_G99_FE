import { http } from './http.js';

/** Central warehouse + branch stock — BE: /api/inventory/* */

import { compactPageParams, unwrapPage } from './pagination.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors ?? body?.data;
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

export async function fetchWarehouseInventory() {
  const { data } = await http.get('/inventory/warehouse');
  return unwrap(data);
}

export async function fetchWarehouseInventoryPage(params = {}) {
  const { data } = await http.get('/inventory/warehouse/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function fetchWarehouseLowStock() {
  const { data } = await http.get('/inventory/warehouse/low-stock');
  return unwrap(data);
}

export async function fetchBranchInventory(branchId) {
  const { data } = await http.get(`/inventory/branches/${branchId}`);
  return unwrap(data);
}

export async function fetchBranchInventoryPage(branchId, params = {}) {
  const { data } = await http.get(`/inventory/branches/${branchId}/page`, { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function updateBranchReorderPoint(branchId, productId, reorderPoint) {
  const { data } = await http.patch(
    `/inventory/branches/${branchId}/products/${productId}/reorder-point`,
    { reorderPoint: Number(reorderPoint) },
  );
  return unwrap(data);
}
