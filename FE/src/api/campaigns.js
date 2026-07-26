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

export async function fetchCampaigns() {
  const { data } = await http.get('/campaigns');
  return unwrap(data);
}

export async function fetchCampaignsPage(params = {}) {
  const { data } = await http.get('/campaigns/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function fetchCampaignById(id) {
  const { data } = await http.get(`/campaigns/${id}`);
  return unwrap(data);
}

export async function createCampaign(payload) {
  const { data } = await http.post('/campaigns', payload);
  return unwrap(data);
}

export async function updateCampaign(id, payload) {
  const { data } = await http.put(`/campaigns/${id}`, payload);
  return unwrap(data);
}

export async function deleteCampaign(id) {
  await http.delete(`/campaigns/${id}`);
}

export async function activateCampaign(id, dates = null) {
  const { data } = await http.patch(
    `/campaigns/${id}/activate`,
    dates ? { startAt: dates.startAt, endAt: dates.endAt } : undefined,
  );
  return unwrap(data);
}

export async function suspendCampaign(id) {
  const { data } = await http.patch(`/campaigns/${id}/suspend`);
  return unwrap(data);
}

export async function deactivateCampaignForBranch(id) {
  const { data } = await http.patch(`/campaigns/${id}/deactivate-for-branch`);
  return unwrap(data);
}

export async function activateCampaignForBranch(id) {
  const { data } = await http.patch(`/campaigns/${id}/activate-for-branch`);
  return unwrap(data);
}
