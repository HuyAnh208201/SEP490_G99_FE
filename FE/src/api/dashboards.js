import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

export async function fetchDirectorDashboard({ from, to } = {}) {
  const { data } = await http.get('/director/dashboard', {
    params: { from, to },
  });
  return unwrap(data);
}

export async function fetchBranchManagerDashboard({ from, to } = {}) {
  const { data } = await http.get('/branch-manager/dashboard', {
    params: { from, to },
  });
  return unwrap(data);
}

export async function fetchWarehouseDashboard({ from, to } = {}) {
  const { data } = await http.get('/warehouse/dashboard', { params: { from, to } });
  return unwrap(data);
}
