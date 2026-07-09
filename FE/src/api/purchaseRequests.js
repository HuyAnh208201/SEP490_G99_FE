import { http } from './http.js';
import * as mock from './purchaseRequestsMock.js';
import {
  flattenConsolidated,
  normalizeRequestDetail,
  normalizeRequestSummary,
  toApprovePayload,
  toDraftPayload,
} from '../lib/purchaseRequestMappers.js';

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

function unwrapList(data) {
  const inner = unwrap(data);
  if (Array.isArray(inner)) return inner;
  if (inner?.listObjects) return inner.listObjects;
  return [];
}

/** Endpoint chưa có / BE chưa chạy → cho phép fallback mock. */
function isUnavailable(err) {
  if (!err?.response) return true;
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
      return unwrapList(data).map(normalizeRequestSummary);
    },
    () => mock.listRequestsMock(params),
  );
}

export function getRequest(id) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/${id}`);
      return normalizeRequestDetail(unwrap(data));
    },
    () => mock.getRequestMock(id),
  );
}

export function getRecommendedProducts(branchId) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/recommended-products`, {
        params: branchId ? { branchId } : undefined,
      });
      const rows = unwrap(data);
      return rows.map((r) => ({
        productId: r.productId ?? r.id,
        name: r.productName ?? r.name,
        code: r.productCode ?? r.code,
        unit: r.unit,
        currentStock: r.currentStock ?? r.stock,
        reorderPoint: r.reorderPoint ?? r.reorder,
        suggestedQty: r.suggestedQty ?? r.suggestedQuantity,
      }));
    },
    () => mock.getRecommendedProductsMock(branchId),
  );
}

export function searchRequestProducts(keyword, params = {}) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/search-products`, {
        params: { keyword, ...params },
      });
      const rows = unwrapList(data);
      return rows.map((p) => ({
        id: p.productId ?? p.id,
        code: p.productCode ?? p.code,
        name: p.productName ?? p.name,
        unit: p.unit,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
      }));
    },
    async () => {
      const all = await mock.getRecommendedProductsMock();
      const q = String(keyword || '').trim().toLowerCase();
      if (!q) return [];
      return all
        .filter((p) => p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
        .map((p) => ({
          id: p.productId,
          code: p.code,
          name: p.name,
          unit: p.unit,
        }));
    },
  );
}

export function getConsolidated(params = {}) {
  return withFallback(
    async () => {
      const { data } = await http.get(`${BASE}/consolidated`, { params });
      const raw = unwrap(data);
      if (Array.isArray(raw) && raw.length && raw[0]?.categories) {
        return flattenConsolidated(raw);
      }
      return Array.isArray(raw) ? raw : [];
    },
    () => mock.getConsolidatedMock(params),
  );
}

export function saveDraft(payload) {
  return withFallback(
    async () => {
      const body = toDraftPayload(payload);
      const url = payload.id ? `${BASE}/${payload.id}/draft` : `${BASE}/draft`;
      const method = payload.id ? http.put : http.post;
      const { data } = await method(url, body);
      return normalizeRequestDetail(unwrap(data));
    },
    () => mock.saveDraftMock(payload),
  );
}

export function submitRequest(payload) {
  return withFallback(
    async () => {
      let id = payload.id;
      if (!id) {
        const draft = await saveDraft(payload);
        id = draft.id;
      } else {
        await saveDraft(payload);
      }
      const { data } = await http.patch(`${BASE}/${id}/submit`, {});
      return normalizeRequestDetail(unwrap(data));
    },
    () => mock.submitRequestMock(payload),
  );
}

export function cancelRequest(id) {
  return withFallback(
    async () => {
      const { data } = await http.patch(`${BASE}/${id}/cancel`, {});
      return normalizeRequestDetail(unwrap(data));
    },
    () => mock.cancelRequestMock(id),
  );
}

export function approveRequest(id, items) {
  return withFallback(
    async () => {
      const { data } = await http.patch(`${BASE}/${id}/approve`, toApprovePayload(items));
      return normalizeRequestDetail(unwrap(data));
    },
    () => mock.approveRequestMock(id, { items }),
  );
}

export function rejectRequest(id, reason) {
  return withFallback(
    async () => {
      const { data } = await http.patch(`${BASE}/${id}/reject`, { reason });
      return normalizeRequestDetail(unwrap(data));
    },
    () => mock.rejectRequestMock(id, reason),
  );
}

export function receiveRequest(id) {
  return withFallback(
    async () => {
      const { data } = await http.post(`${BASE}/${id}/receive`, {});
      return normalizeRequestDetail(unwrap(data));
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
