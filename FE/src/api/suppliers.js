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

export async function fetchSuppliers() {
  const { data } = await http.get('/suppliers');
  return unwrap(data);
}

export async function fetchSuppliersPage(params = {}) {
  const { data } = await http.get('/suppliers/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function fetchSupplierById(id) {
  const { data } = await http.get(`/suppliers/${id}`);
  return unwrap(data);
}

export async function createSupplier(payload) {
  const { data } = await http.post('/suppliers', payload);
  return unwrap(data);
}

export async function updateSupplier(id, payload) {
  const { data } = await http.put(`/suppliers/${id}`, payload);
  return unwrap(data);
}

export async function deleteSupplier(id) {
  await http.delete(`/suppliers/${id}`);
}
