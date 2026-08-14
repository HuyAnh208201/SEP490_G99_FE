import { http } from './http.js';

/**
 * API layer cho luồng Lô vận chuyển (Dispatch Orders) — màn 2.4 & 2.5.
 * BE bọc response trong { success, data, message, statusCode }.
 */

import { compactPageParams, unwrapPage } from './pagination.js';

const BASE = '/dispatch-orders';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors ?? body?.data;
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (data?.listObjects) return data.listObjects;
  return [];
}

/** Yêu cầu đã duyệt, sẵn sàng gom lô (Dispatch Planning). */
export async function listApprovedRequests() {
  const { data } = await http.get(`${BASE}/approved-requests`);
  return asList(unwrap(data));
}

export async function listApprovedRequestsPage(params = {}) {
  const { data } = await http.get(`${BASE}/approved-requests/page`, { params: compactPageParams(params) });
  return unwrapPage(data);
}

/** Tạo lô vận chuyển cho một yêu cầu đã duyệt. */
export async function createDispatchOrder({ requestId, supplierIds, shipperName, shipperPhone }) {
  const payload = { requestId, shipperName, shipperPhone };
  if (Array.isArray(supplierIds) && supplierIds.length > 0) {
    payload.supplierIds = supplierIds;
  }
  const { data } = await http.post(BASE, payload);
  return unwrap(data);
}

/** Danh sách lô vận chuyển. */
export async function listDispatchOrders() {
  const { data } = await http.get(BASE);
  return asList(unwrap(data));
}

export async function listDispatchOrdersPage(params = {}) {
  const { data } = await http.get(`${BASE}/page`, { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function getDispatchOrder(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return unwrap(data);
}

/** Cập nhật trạng thái lô: PREPARING → DELIVERING → RECEIVED. */
export async function updateDispatchStatus(id, status) {
  const { data } = await http.patch(`${BASE}/${id}/status`, { status: String(status).toUpperCase() });
  return unwrap(data);
}
