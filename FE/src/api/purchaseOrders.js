import { http } from './http.js';

/**
 * API layer cho luồng Đơn đặt hàng nhà cung cấp (Purchase Orders) — Giai đoạn 3.
 * Kho tổng đặt NCC bổ sung tồn kho -> giải phóng yêu cầu AWAITING_STOCK.
 * BE bọc response trong { success, data, message, statusCode }.
 */

import { compactPageParams, unwrapPage } from './pagination.js';

const BASE = '/purchase-orders';

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

/** Sản phẩm kho tổng đang thiếu (gợi ý đặt NCC). */
export async function listRecommendedProducts() {
  const { data } = await http.get(`${BASE}/recommended-products`);
  return asList(unwrap(data));
}

/** Tìm sản phẩm để thêm tay vào đơn. */
export async function searchPurchaseProducts(supplierId, keyword) {
  const { data } = await http.get(`${BASE}/search-products`, {
    params: {
      ...(supplierId ? { supplierId } : {}),
      ...(keyword ? { keyword } : {}),
    },
  });
  return asList(unwrap(data));
}

/** Tạo đơn đặt hàng NCC. items: [{ productId, quantity, unitPrice? }] */
export async function createPurchaseOrder(payload) {
  const { data } = await http.post(BASE, payload);
  return unwrap(data);
}

export async function listPurchaseOrders() {
  const { data } = await http.get(BASE);
  return asList(unwrap(data));
}

export async function listPurchaseOrdersPage(params = {}) {
  const { data } = await http.get(`${BASE}/page`, { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function getPurchaseOrder(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return unwrap(data);
}

/** Nhập hàng về kho tổng (cộng tồn + giải phóng yêu cầu AWAITING_STOCK). */
export async function receivePurchaseOrder(id) {
  const { data } = await http.patch(`${BASE}/${id}/receive`);
  return unwrap(data);
}

export async function cancelPurchaseOrder(id) {
  const { data } = await http.patch(`${BASE}/${id}/cancel`);
  return unwrap(data);
}
