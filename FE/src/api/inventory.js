import { http } from './http.js';

/** Central warehouse + branch stock — BE: /api/inventory/* */

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

export async function fetchWarehouseLowStock() {
  const { data } = await http.get('/inventory/warehouse/low-stock');
  return unwrap(data);
}

export async function fetchBranchInventory(branchId) {
  const { data } = await http.get(`/inventory/branches/${branchId}`);
  return unwrap(data);
}
