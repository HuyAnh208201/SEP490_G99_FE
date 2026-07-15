import { http } from './http.js';

/**
 * API layer cho kiểm kê hàng hóa & cập nhật tồn kho (mục 2.6).
 * BE bọc response trong { success, data, message, statusCode }.
 */

const BASE = '/inventory-counts';

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

/** Phiếu kiểm kê: sản phẩm + số hệ thống của chi nhánh. */
export async function getCountSheet() {
  const { data } = await http.get(`${BASE}/sheet`);
  return unwrap(data);
}

/** Nộp phiên kiểm kê. */
export async function submitCount({ note, items }) {
  const { data } = await http.post(BASE, { note, items });
  return unwrap(data);
}

/** Lịch sử kiểm kê (Count History). */
export async function listCountHistory() {
  const { data } = await http.get(BASE);
  return asList(unwrap(data));
}

export async function getCountSession(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return unwrap(data);
}

/** Duyệt phiên kiểm kê → cập nhật tồn kho chi nhánh. */
export async function approveCountSession(id) {
  const { data } = await http.patch(`${BASE}/${id}/approve`);
  return unwrap(data);
}

export async function rejectCountSession(id) {
  const { data } = await http.patch(`${BASE}/${id}/reject`);
  return unwrap(data);
}
