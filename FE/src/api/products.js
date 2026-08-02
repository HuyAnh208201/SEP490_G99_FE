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

export async function fetchProducts() {
  const { data } = await http.get('/products');
  const rows = unwrap(data);
  return Array.isArray(rows) ? rows : [];
}

/** Lightweight POS counter catalog — prefer this over fetchProducts(). */
export async function fetchPosCatalog() {
  // Mounted on PosOrderController (/api/pos/orders/catalog) so cashiers hit a proven route tree.
  const { data } = await http.get('/pos/orders/catalog', { timeout: 10000 });
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
