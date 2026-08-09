import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

export async function fetchMembershipTiers() {
  const { data } = await http.get('/system/membership-tiers');
  return unwrap(data);
}

export async function updateMembershipTier(id, payload) {
  const { data } = await http.put(`/system/membership-tiers/${id}`, payload);
  return unwrap(data);
}

export async function fetchShortDateCategories() {
  const { data } = await http.get('/system/short-date-categories');
  return unwrap(data);
}

export async function updateShortDateCategories(categoryIds) {
  const { data } = await http.put('/system/short-date-categories', { categoryIds });
  return unwrap(data);
}
