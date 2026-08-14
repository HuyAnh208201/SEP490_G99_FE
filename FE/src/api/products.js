import { http } from './http.js';

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

/** @deprecated Prefer fetchProductsPage — soft-capped on BE (max 100). */
export async function fetchProducts() {
  const { data } = await http.get('/products');
  const rows = unwrap(data);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchProductCount() {
  const { data } = await http.get('/products/count');
  return Number(unwrap(data)) || 0;
}

/**
 * Lightweight POS counter catalog (paged).
 * @param {{ search?: string, page?: number, size?: number, categoryId?: number }} [params]
 */
export async function fetchPosCatalog(params = {}) {
  const { data } = await http.get('/pos/orders/catalog', {
    timeout: 60000,
    params: {
      ...compactPageParams(params),
      paged: true,
      categoryId: params.categoryId,
    },
  });
  // Paged response shape from successPage
  if (data?.data?.listObjects || data?.data?.content) {
    return unwrapPage(data).items;
  }
  const rows = unwrap(data);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchProductsPage(params = {}) {
  const { data } = await http.get('/products/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function fetchProductById(id) {
  const { data } = await http.get(`/products/${id}`);
  return unwrap(data);
}

export async function generateBarcode() {
  const { data } = await http.post('/products/generate-barcode');
  return unwrap(data);
}

export async function createProduct(payload) {
  const { data } = await http.post('/products', payload);
  return unwrap(data);
}

export async function updateProduct(id, payload) {
  const { data } = await http.put(`/products/${id}`, payload);
  return unwrap(data);
}

export async function deleteProduct(id) {
  await http.delete(`/products/${id}`);
}

export async function fetchProductSalePrices(id) {
  const { data } = await http.get(`/products/${id}/sale-prices`);
  const rows = unwrap(data);
  return Array.isArray(rows) ? rows : [];
}

export async function scheduleProductSalePrice(id, payload) {
  const { data } = await http.post(`/products/${id}/sale-prices`, payload);
  return unwrap(data);
}
