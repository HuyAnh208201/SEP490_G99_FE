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

/** Build a query-params object, dropping null/undefined/empty values. */
function buildParams(input) {
  const params = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (value != null && value !== '') params[key] = value;
  });
  return params;
}

/**
 * Revenue rollup. `groupBy` is one of shift | employee | branch.
 * `branchId` is honoured for Admin/Director; the server ignores it for Branch
 * Managers and forces their own branch scope.
 */
export async function fetchRevenue({ groupBy, from, to, branchId } = {}) {
  const { data } = await http.get('/reports/revenue', {
    params: buildParams({ groupBy, from, to, branchId }),
  });
  return unwrap(data) ?? [];
}

export async function fetchRevenuePage(params = {}) {
  const groupBy = params.groupBy || 'shift';
  const { data } = await http.get('/reports/revenue/page', { params: compactPageParams(params) });
  return unwrapPage(data, (row) => ({
    ...row,
    shiftId: groupBy === 'shift' ? row.id : undefined,
    cashierId: groupBy === 'employee' ? row.id : undefined,
    cashierName: groupBy === 'employee' ? row.name : undefined,
    branchId: groupBy === 'branch' ? row.id : undefined,
    branchName: groupBy === 'branch' ? row.name : undefined,
  }));
}

/** Invoice history within the range (server scopes by role). */
export async function fetchInvoices({ from, to, branchId } = {}) {
  const { data } = await http.get('/reports/invoices', {
    params: buildParams({ from, to, branchId }),
  });
  return unwrap(data) ?? [];
}

export async function fetchInvoicesPage(params = {}) {
  const { data } = await http.get('/reports/invoices/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

/** Closed-shift cash discrepancy history within the range. */
export async function fetchCashDiscrepancies({ from, to, branchId } = {}) {
  const { data } = await http.get('/reports/cash-discrepancies', {
    params: buildParams({ from, to, branchId }),
  });
  return unwrap(data) ?? [];
}

export async function fetchCashDiscrepanciesPage(params = {}) {
  const { data } = await http.get('/reports/cash-discrepancies/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

/** Loyalty point earn/redeem history within the range. */
export async function fetchPointTransactions({ from, to, branchId } = {}) {
  const { data } = await http.get('/reports/point-transactions', {
    params: buildParams({ from, to, branchId }),
  });
  return unwrap(data) ?? [];
}

export async function fetchPointTransactionsPage(params = {}) {
  const { data } = await http.get('/reports/point-transactions/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

/** Dashboard KPIs — BM is forced to own branch; Director/Admin may pass branchId. */
export async function fetchReportSummary({ from, to, branchId, shiftId } = {}) {
  const { data } = await http.get('/reports/summary', {
    params: buildParams({ from, to, branchId, shiftId }),
  });
  return unwrap(data);
}

export async function fetchReportTrend({ from, to, branchId, shiftId } = {}) {
  const { data } = await http.get('/reports/trend', {
    params: buildParams({ from, to, branchId, shiftId }),
  });
  return unwrap(data) ?? [];
}

export async function fetchTopProducts({ from, to, branchId, shiftId, limit = 5 } = {}) {
  const { data } = await http.get('/reports/top-products', {
    params: buildParams({ from, to, branchId, shiftId, limit }),
  });
  return unwrap(data) ?? [];
}
