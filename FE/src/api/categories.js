import { http } from './http.js';

import { compactPageParams, unwrapPage } from './pagination.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

export async function fetchCategories(params = {}) {
  const { data } = await http.get('/categories', { params });
  return unwrap(data);
}

export async function fetchCategoriesPage(params = {}) {
  const { data } = await http.get('/categories/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function fetchCategoryById(id) {
  const { data } = await http.get(`/categories/${id}`);
  return unwrap(data);
}

export async function createCategory(payload) {
  const { data } = await http.post('/categories', payload);
  return unwrap(data);
}

export async function updateCategory(id, payload) {
  const { data } = await http.put(`/categories/${id}`, payload);
  return unwrap(data);
}

export async function deactivateCategory(id) {
  const { data } = await http.patch(`/categories/${id}/deactivate`);
  return unwrap(data);
}

export async function activateCategory(id) {
  const { data } = await http.patch(`/categories/${id}/activate`);
  return unwrap(data);
}

/** @deprecated Use deactivateCategory — hard delete is no longer supported. */
export async function deleteCategory(id) {
  await deactivateCategory(id);
}
