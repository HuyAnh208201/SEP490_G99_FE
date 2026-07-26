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

export async function fetchBranches() {
  const { data } = await http.get('/branches');
  return unwrap(data);
}

export async function fetchBranchesPage(params = {}) {
  const { data } = await http.get('/branches/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

export async function fetchBranchById(id) {
  const { data } = await http.get(`/branches/${id}`);
  return unwrap(data);
}

export async function createBranch(payload) {
  const { data } = await http.post('/branches', payload);
  return unwrap(data);
}

export async function updateBranch(id, payload) {
  const { data } = await http.put(`/branches/${id}`, payload);
  return unwrap(data);
}

export async function updateBranchStatus(id, status, extras = {}) {
  const { data } = await http.patch(`/branches/${id}/status`, { status, ...extras });
  return unwrap(data);
}

export async function sendBranchSuspendCode(branchId, email) {
  const { data } = await http.post(`/branches/${branchId}/suspend/send-code`, { email });
  return unwrap(data);
}

export async function assignStaffToBranch(branchId, payload) {
  const { data } = await http.post(`/branches/${branchId}/assign-staff`, payload);
  return unwrap(data);
}

export async function createBranchManager(branchId, payload) {
  const { data } = await http.post(`/branches/${branchId}/manager`, payload);
  return unwrap(data);
}

export async function createCashier(payload) {
  const { data } = await http.post('/branches/staff/cashier', payload);
  return unwrap(data);
}

export async function createInventoryStaff(payload) {
  const { data } = await http.post('/branches/staff/inventory', payload);
  return unwrap(data);
}
