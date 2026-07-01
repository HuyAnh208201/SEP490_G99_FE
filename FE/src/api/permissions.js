import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors;
    throw err;
  }
  return body.data;
}

export async function fetchMyPermissions() {
  const { data } = await http.get('/permissions/me');
  return unwrap(data);
}

export async function fetchPermissionMatrix() {
  const { data } = await http.get('/permissions/matrix');
  return unwrap(data);
}
