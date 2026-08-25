import { http } from './http.js';
import { unwrapPage } from './pagination.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors ?? body?.data;
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

export async function fetchCurrentShiftSession() {
  const { data } = await http.get('/shift-sessions/current');
  return unwrap(data);
}

export async function fetchOpeningShiftSession() {
  const { data } = await http.get('/shift-sessions/opening');
  return unwrap(data);
}

export async function confirmOpeningFund(note) {
  const { data } = await http.post('/shift-sessions/confirm-opening-fund', { note });
  return unwrap(data);
}

export async function startShiftSession({
  note,
  confirmedReceived = true,
  receivedFromEmployeeId,
  fundMethod = 'CASH',
} = {}) {
  const { data } = await http.post('/shift-sessions/start', {
    note,
    confirmedReceived,
    receivedFromEmployeeId,
    fundMethod,
  });
  return unwrap(data);
}

export async function fetchClosingShiftSession() {
  const { data } = await http.get('/shift-sessions/closing');
  return unwrap(data);
}

export async function confirmVerification(items) {
  const { data } = await http.post('/shift-sessions/confirm-verification', { items });
  return unwrap(data);
}

export async function confirmHandover(payload) {
  const { data } = await http.post('/shift-sessions/confirm-handover', payload);
  return unwrap(data);
}

export async function saveClosingDraft(payload) {
  const { data } = await http.post('/shift-sessions/closing/draft', payload);
  return unwrap(data);
}

export async function closeCashierShift() {
  const { data } = await http.post('/shift-sessions/close');
  return unwrap(data);
}

export async function closeInventoryShift(payload) {
  const { data } = await http.post('/shift-sessions/close-inventory', payload);
  return unwrap(data);
}

export async function fetchShiftSessionHistory(params = {}) {
  const { data } = await http.get('/shift-sessions/history', {
    params: {
      page: params.page ?? 1,
      size: params.size ?? 20,
    },
  });
  return unwrapPage(data);
}

export async function fetchShiftSessionHistoryList() {
  const page = await fetchShiftSessionHistory({ page: 1, size: 100 });
  return page.items || [];
}

export async function fetchBranchShiftMonitor() {
  const { data } = await http.get('/shift-sessions/branch/monitor');
  return unwrap(data);
}

export async function fetchPendingReconciliation() {
  const { data } = await http.get('/shift-sessions/reconciliation/pending');
  return unwrap(data);
}

export async function fetchReconciliationList({ discrepancy = 'with', status } = {}) {
  const { data } = await http.get('/shift-sessions/reconciliation', {
    params: {
      discrepancy,
      ...(status ? { status } : {}),
    },
  });
  return unwrap(data);
}

export async function fetchBranchAttendance({ from, to } = {}) {
  const { data } = await http.get('/shift-sessions/branch/attendance', {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });
  return unwrap(data);
}

export async function fetchBranchRefunds({ from, to } = {}) {
  const { data } = await http.get('/shift-sessions/branch/refunds', {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });
  return unwrap(data);
}

export async function fetchReconciliationDetail(sessionId) {
  const { data } = await http.get(`/shift-sessions/reconciliation/${sessionId}`);
  return unwrap(data);
}

export async function decideReconciliation(sessionId, payload) {
  const { data } = await http.post(`/shift-sessions/reconciliation/${sessionId}/decision`, payload);
  return unwrap(data);
}

export function isShiftOpen(session) {
  return session?.status === 'OPEN';
}

export function isShiftClosing(session) {
  return session?.status === 'CLOSING' || session?.status === 'PENDING_HANDOVER';
}

export function differenceStatusLabel(status) {
  switch (status) {
    case 'BALANCED':
      return 'Balanced';
    case 'CASH_SHORTAGE':
      return 'Cash shortage';
    case 'CASH_EXCESS':
      return 'Cash excess';
    default:
      return status || '—';
  }
}

export function shiftBasePath() {
  return '/pos/shift';
}

export function workHomePath() {
  return '/pos';
}
