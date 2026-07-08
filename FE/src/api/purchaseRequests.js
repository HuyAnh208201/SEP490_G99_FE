import { http } from './http.js';
import * as mock from './purchaseRequestsMock.js';

/**
 * API layer cho luồng Yêu cầu nhập hàng (Purchase Requests).
 *
 * Ưu tiên gọi BE thật. Nếu BE chưa sẵn sàng (network error / 404 / 501 / 5xx không body)
 * sẽ tự fallback sang mock để FE vẫn thao tác được cả 2 màn. Bật mock cứng bằng
 * biến môi trường VITE_PR_MOCK=true.
 */

const FORCE_MOCK = import.meta.env.VITE_PR_MOCK === 'true';
const BASE = '/purchase-requests';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors ?? body?.data;
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

/** Endpoint chưa có / BE chưa chạy → cho phép fallback mock. */
function isUnavailable(err) {
  if (!err?.response) return true; // network / CORS / timeout
  const s = err.response.status;
  return s === 404 || s === 501 || (s >= 502 && s <= 504);
}

async function withFallback(realFn, mockFn) {
  if (FORCE_MOCK) return mockFn();
  try {
    return await realFn();
  } catch (err) {
    if (isUnavailable(err)) return mockFn();
    throw err;
  }
}

export function listRequests(params = {}) {
  return withFallback(
    async () => {
      const { data } = await http.get(BASE, { params });
      return unwrap(data);
    },
    () => mock.listRequestsMock(params),
  );
}

export function getRequest(id) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/${id}`);
      return unwrap(data);
    },
    () => mock.getRequestMock(id),
  );
}

export function getRecommendedProducts(branchId) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/recommended-products`, { params: { branchId } });
      return unwrap(data);
    },
    () => mock.getRecommendedProductsMock(branchId),
  );
}

export function getConsolidated(params = {}) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/consolidated`, { params });
      return unwrap(data);
    },
    () => mock.getConsolidatedMock(params),
  );
}

export function saveDraft(payload) {
  return withFallback(
    async () => {
      const url = payload.id ? `${BASE}/${payload.id}/draft` : `${BASE}/draft`;
      const method = payload.id ? http.put : http.post;
      const { data } = await method(url, payload);
      return unwrap(data);
    },
    () => mock.saveDraftMock(payload),
  );
}

export function submitRequest(payload) {
  return withFallback(
    async () => {
      const url = payload.id ? `${BASE}/${payload.id}/submit` : `${BASE}/submit`;
      const { data } = await http.post(url, payload);
      return unwrap(data);
    },
    () => mock.submitRequestMock(payload),
  );
}

export function cancelRequest(id) {
  return withFallback(
    async () => {
      const { data } = await http.post(`${BASE}/${id}/cancel`, {});
      return unwrap(data);
    },
    () => mock.cancelRequestMock(id),
  );
}

export function approveRequest(id, items) {
  return withFallback(
    async () => {
      const { data } = await http.post(`${BASE}/${id}/approve`, { items });
      return unwrap(data);
    },
    () => mock.approveRequestMock(id, { items }),
  );
}

export function rejectRequest(id, reason) {
  return withFallback(
    async () => {
      const { data } = await http.post(`${BASE}/${id}/reject`, { reason });
      return unwrap(data);
    },
    () => mock.rejectRequestMock(id, reason),
  );
}

export function receiveRequest(id) {
  return withFallback(
    async () => {
      const { data } = await http.post(`${BASE}/${id}/receive`, {});
      return unwrap(data);
    },
    () => mock.receiveRequestMock(id),
  );
}

/** Danh mục hỗ trợ (chi nhánh + sản phẩm) — dùng cho form. Fallback mock. */
export function fetchRequestBranches() {
  return withFallback(
    async () => {
      const { data } = await http.get('/branches');
      const rows = unwrap(data);
      return rows.map((b) => ({ id: b.id, name: b.name, address: b.address }));
    },
    () => Promise.resolve(mock.MOCK_BRANCHES),
  );
}

export function fetchRequestProducts() {
  return withFallback(
    async () => {
      const { data } = await http.get('/products');
      const rows = unwrap(data);
      return rows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        currentStock: p.currentStock ?? null,
        supplierId: p.supplierId ?? null,
      }));
    },
    () => Promise.resolve(mock.MOCK_PRODUCTS),
  );
}
