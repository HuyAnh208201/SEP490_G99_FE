import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

export async function fetchCategories() {
  const { data } = await http.get('/categories');
  return unwrap(data);
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

export async function deleteCategory(id) {
  await http.delete(`/categories/${id}`);
}
