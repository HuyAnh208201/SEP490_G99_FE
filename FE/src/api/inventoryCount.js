import { http } from './http.js';

/**
 * API layer cho kiểm kê hàng hóa & cập nhật tồn kho (mục 2.6).
 * BE bọc response trong { success, data, message, statusCode }.
 */

import { compactPageParams, unwrapPage } from './pagination.js';

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

/** Phiếu kiểm kê: sản phẩm + số hệ thống của chi nhánh (paged). */
export async function getCountSheet(params = {}) {
  const { data } = await http.get(`${BASE}/sheet`, { params: compactPageParams(params) });
  return unwrap(data);
}

/**
 * Load every page of the count sheet (BE max size 100) so cashiers/IS are not
 * silently capped at the first 100 SKUs.
 */
export async function getFullCountSheet(params = {}) {
  const size = Math.min(Number(params.size) || 100, 100);
  const categoryId = params.categoryId;
  let page = 1;
  let totalPages = 1;
  const products = [];
  let meta = null;

  do {
    const data = await getCountSheet({
      page,
      size,
      ...(categoryId != null ? { categoryId } : {}),
    });
    if (!meta) meta = data;
    products.push(...(data?.products || []));
    totalPages = Math.max(1, Number(data?.totalPages) || 1);
    page += 1;
  } while (page <= totalPages);

  return {
    ...meta,
    products,
    pageNumber: 1,
    pageSize: products.length,
    totalElements: products.length,
    totalPages: 1,
  };
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

export async function listCountHistoryPage(params = {}) {
  const { discrepancy, from, to, status, ...rest } = params;
  const query = {
    ...compactPageParams(rest),
    ...(discrepancy ? { discrepancy } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(status ? { status } : {}),
  };
  const { data } = await http.get(`${BASE}/page`, { params: query });
  return unwrapPage(data);
}

export async function getCountSession(id) {
  const { data } = await http.get(`${BASE}/${id}`);
  return unwrap(data);
}
