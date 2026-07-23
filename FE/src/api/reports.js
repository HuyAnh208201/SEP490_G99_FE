import { http } from './http.js';

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

/** Invoice history within the range (server scopes by role). */
export async function fetchInvoices({ from, to, branchId } = {}) {
  const { data } = await http.get('/reports/invoices', {
    params: buildParams({ from, to, branchId }),
  });
  return unwrap(data) ?? [];
}

/** Closed-shift cash discrepancy history within the range. */
export async function fetchCashDiscrepancies({ from, to, branchId } = {}) {
  const { data } = await http.get('/reports/cash-discrepancies', {
    params: buildParams({ from, to, branchId }),
  });
  return unwrap(data) ?? [];
}

/** Loyalty point earn/redeem history within the range. */
export async function fetchPointTransactions({ from, to, branchId } = {}) {
  const { data } = await http.get('/reports/point-transactions', {
    params: buildParams({ from, to, branchId }),
  });
  return unwrap(data) ?? [];
}
