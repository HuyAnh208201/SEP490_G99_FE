import { http } from './http.js';
import { compactPageParams, unwrapPage } from './pagination.js';
import { fetchProductsPage } from './products.js';
import {
  flattenConsolidated,
  normalizeRequestDetail,
  normalizeRequestSummary,
  toApprovePayload,
  toDraftPayload,
} from '../lib/purchaseRequestMappers.js';

/**
 * Purchase Requests API — real backend only.
 * BE wraps responses in { success, data, message, statusCode }.
 */

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

/** Map FE status (approved, awaiting_stock) to BE enum (APPROVED, AWAITING_STOCK). */
function toApiStatus(status) {
  if (!status) return undefined;
  return String(status).toUpperCase();
}

function toListParams(params = {}) {
  const { status, ...rest } = params;
  return compactPageParams({ ...rest, status: toApiStatus(status) });
}

export async function listRequests(params = {}) {
  const { data } = await http.get(BASE, { params: toListParams(params) });
  return unwrapList(data).map(normalizeRequestSummary);
}

export async function listRequestsPage(params = {}) {
  const { data } = await http.get(BASE, { params: toListParams(params) });
  return unwrapPage(data, normalizeRequestSummary);
}

export async function getRequest(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return normalizeRequestDetail(unwrap(data));
}

export async function getRecommendedProducts(branchId) {
  const { data } = await http.get(`${BASE}/recommended-products`, {
    params: branchId ? { branchId } : undefined,
  });
  const rows = unwrap(data);
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    productId: r.productId ?? r.id,
    name: r.productName ?? r.name,
    code: r.productCode ?? r.code,
    unit: r.unit,
    currentStock: r.currentStock ?? r.stock,
    reorderPoint: r.reorderPoint ?? r.reorder,
    suggestedQty: r.suggestedQty ?? r.suggestedQuantity,
    topPackagingLabel: r.topPackagingLabel,
    topPackagingConversionQty: r.topPackagingConversionQty,
    unitCost: r.unitCost ?? r.referenceImportPrice ?? null,
    referenceImportPrice: r.referenceImportPrice ?? r.unitCost ?? null,
    soldLast30Days: r.soldLast30Days ?? 0,
    priorityReason: r.priorityReason,
  }));
}

export async function searchRequestProducts(keyword, params = {}) {
  const { data } = await http.get(`${BASE}/search-products`, {
    params: compactPageParams({
      keyword: keyword || undefined,
      page: 1,
      size: 20,
      ...params,
    }),
  });
  return unwrapPage(data, (p) => ({
    id: p.productId ?? p.id,
    code: p.productCode ?? p.code,
    name: p.productName ?? p.name,
    barcode: p.barcode,
    unit: p.unit,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    currentStock: p.currentStock ?? 0,
    reorderPoint: p.reorderPoint ?? null,
    lowStock: Boolean(p.lowStock),
    topPackagingLabel: p.topPackagingLabel,
    unitsPerImportUnit: p.topPackagingConversionQty,
    unitCost: p.unitCost ?? p.referenceImportPrice ?? null,
    referenceImportPrice: p.referenceImportPrice ?? p.unitCost ?? null,
  }));
}

export async function getConsolidated(params = {}) {
  const { data } = await http.get(`${BASE}/consolidated`, { params });
  const raw = unwrap(data);
  if (Array.isArray(raw) && raw.length && raw[0]?.categories) {
    return flattenConsolidated(raw);
  }
  return Array.isArray(raw) ? raw : [];
}

export async function getConsolidatedPage(params = {}) {
  const { data } = await http.get(`${BASE}/consolidated/page`, { params: compactPageParams(params) });
  const page = unwrapPage(data);
  return { ...page, items: flattenConsolidated(page.items) };
}

export async function saveDraft(payload) {
  const body = toDraftPayload(payload);
  const url = payload.id ? `${BASE}/${payload.id}/draft` : `${BASE}/draft`;
  const method = payload.id ? http.put : http.post;
  const { data } = await method(url, body);
  return normalizeRequestDetail(unwrap(data));
}

export async function submitRequest(payload) {
  let id = payload.id;
  if (!id) {
    const draft = await saveDraft(payload);
    id = draft.id;
  } else {
    await saveDraft(payload);
  }
  const { data } = await http.patch(`${BASE}/${id}/submit`, {});
  return normalizeRequestDetail(unwrap(data));
}

export async function cancelRequest(id) {
  const { data } = await http.patch(`${BASE}/${id}/cancel`, {});
  return normalizeRequestDetail(unwrap(data));
}

export async function approveRequest(id, items) {
  const { data } = await http.patch(`${BASE}/${id}/approve`, toApprovePayload(items));
  return normalizeRequestDetail(unwrap(data));
}

export async function receiveRequest(id) {
  const { data } = await http.post(`${BASE}/${id}/receive`, {});
  return normalizeRequestDetail(unwrap(data));
}

export async function fetchRequestBranches() {
  const { data } = await http.get(`${BASE}/branches`);
  const rows = unwrap(data);
  return (Array.isArray(rows) ? rows : []).map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
  }));
}

export async function fetchRequestProducts(params = {}) {
  const page = await fetchProductsPage({ page: 1, size: 50, ...params });
  return (page.items || []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    barcode: p.barcode,
    unit: p.unit,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    currentStock: p.currentStock ?? null,
    reorderPoint: p.branchReorderPoint ?? p.reorderPoint ?? null,
    supplierId: p.supplierId ?? null,
    topPackagingLabel: p.topPackagingLabel,
    unitsPerImportUnit: p.topPackagingConversionQty ?? p.unitsPerImportUnit,
  }));
}
