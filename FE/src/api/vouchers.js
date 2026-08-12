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

// ---- Voucher types ----

export async function fetchVoucherCatalogs() {
  const { data } = await http.get('/voucher-catalog');
  return unwrap(data) ?? [];
}

export async function fetchVoucherCatalogPage(params = {}) {
  const { data } = await http.get('/voucher-catalog/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function createVoucherCatalog(payload) {
  const { data } = await http.post('/voucher-catalog', payload);
  return unwrap(data);
}

export async function updateVoucherCatalog(id, payload) {
  const { data } = await http.put(`/voucher-catalog/${id}`, payload);
  return unwrap(data);
}

/** Disabling a type blocks every code of that type at the counter. */
export async function setVoucherCatalogStatus(id, status) {
  const { data } = await http.patch(`/voucher-catalog/${id}/status`, null, { params: { status } });
  return unwrap(data);
}

export async function deleteVoucherCatalog(id) {
  await http.delete(`/voucher-catalog/${id}`);
}

// ---- Issued codes ----

export async function fetchVouchersPage(params = {}) {
  const { data } = await http.get('/vouchers/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

/** Issues one code for a named customer, or a batch of shared codes. Returns the codes. */
export async function issueVouchers(payload) {
  const { data } = await http.post('/vouchers', payload);
  return unwrap(data) ?? [];
}

export async function revokeVoucher(id) {
  const { data } = await http.patch(`/vouchers/${id}/revoke`);
  return unwrap(data);
}

export async function deleteVoucher(id) {
  await http.delete(`/vouchers/${id}`);
}
