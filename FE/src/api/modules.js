import { http } from './http.js';
import {
  fetchBranchManagerDashboard,
  fetchDirectorDashboard,
  fetchWarehouseDashboard,
} from './dashboards.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

/** Gọi endpoint stub module — trả placeholder từ BE */
export async function fetchModule(path) {
  const { data } = await http.get(path);
  return unwrap(data);
}

export const directorApi = {
  dashboard: (params) => fetchDirectorDashboard(params),
  branches: () => fetchModule('/director/branches'),
  performance: () => fetchModule('/director/reports/performance'),
  planning: () => fetchModule('/director/planning'),
  revenuePromos: () => fetchModule('/director/revenue-promos'),
};

export const branchApi = {
  list: () => fetchModule('/director/branches'),
};

export const branchManagerApi = {
  dashboard: (params) => fetchBranchManagerDashboard(params),
  staff: () => fetchModule('/branch-manager/staff'),
  shifts: () => fetchModule('/branch-manager/shifts'),
  importRequests: () => fetchModule('/branch-manager/import-requests'),
  revenuePromos: () => fetchModule('/branch-manager/revenue-promos'),
  approveCashDiscrepancy: () =>
    http.post('/branch-manager/cash-discrepancies/approve').then((r) => unwrap(r.data)),
  approveSupplyImport: () =>
    http.post('/branch-manager/supply-imports/approve').then((r) => unwrap(r.data)),
};

export const warehouseApi = {
  dashboard: () => fetchWarehouseDashboard(),
  inventory: () => fetchModule('/warehouse/inventory'),
  importRequests: () => fetchModule('/warehouse/import-requests'),
  dispatchOrders: () => fetchModule('/warehouse/dispatch-orders'),
  chooseSupplier: () =>
    http.post('/warehouse/suppliers/choose').then((r) => unwrap(r.data)),
};

export const systemApi = {
  settings: () => fetchModule('/system/settings'),
};
