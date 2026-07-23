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

export async function startShiftSession(note) {
  const { data } = await http.post('/shift-sessions/start', { note });
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

export async function fetchShiftSessionHistory() {
  const { data } = await http.get('/shift-sessions/history');
  return unwrap(data);
}

export async function fetchPendingApprovals() {
  const { data } = await http.get('/shift-sessions/pending');
  return unwrap(data) ?? [];
}

export async function approveSession(id, note) {
  const { data } = await http.post(`/shift-sessions/${id}/approve`, { note });
  return unwrap(data);
}

export async function rejectSession(id, note) {
  const { data } = await http.post(`/shift-sessions/${id}/reject`, { note });
  return unwrap(data);
}

export function isShiftOpen(session) {
  return session?.status === 'OPEN';
}

export function isShiftClosing(session) {
  return session?.status === 'PENDING_HANDOVER';
}

export function shiftBasePath() {
  return '/pos/shift';
}

export function workHomePath() {
  return '/pos';
}
