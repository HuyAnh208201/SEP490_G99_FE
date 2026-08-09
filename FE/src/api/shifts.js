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

export async function fetchShifts(branchId) {
  const params = branchId ? { branchId } : {};
  const { data } = await http.get('/shifts', { params });
  return unwrap(data);
}

export async function fetchShiftById(id) {
  const { data } = await http.get(`/shifts/${id}`);
  return unwrap(data);
}

export async function createShift(payload) {
  const { data } = await http.post('/shifts', payload);
  return unwrap(data);
}

export async function updateShift(id, payload) {
  const { data } = await http.put(`/shifts/${id}`, payload);
  return unwrap(data);
}

export async function deleteShift(id) {
  const { data } = await http.delete(`/shifts/${id}`);
  return unwrap(data);
}

export async function publishShift(id) {
  const { data } = await http.put(`/shifts/${id}/publish`);
  return unwrap(data);
}

export async function assignEmployees(shiftId, employeeIds, requiredRole) {
  const { data } = await http.post(`/shifts/${shiftId}/assign`, {
    employeeIds,
    requiredRole,
  });
  return unwrap(data);
}

export async function removeEmployee(shiftId, employeeId) {
  const { data } = await http.delete(`/shifts/${shiftId}/assign/${employeeId}`);
  return unwrap(data);
}

/**
 * Upsert DRAFT for a slot window and sync cashiers + inventory staff. Empty lists clears the slot.
 * `openingCash` only applies to the first slot of the day; null lets the backend use its default.
 */
export async function assignToSlot({
  branchId,
  startTime,
  endTime,
  openingCash,
  cashiers,
  inventoryStaff,
}) {
  const { data } = await http.post('/shifts/slot/assign', {
    branchId,
    startTime,
    endTime,
    openingCash: openingCash ?? null,
    cashiers: cashiers || [],
    inventoryStaff: inventoryStaff || [],
  });
  return unwrap(data);
}

/** Adjust the cash float of a shift by hand. Allowed while the shift is DRAFT or PUBLISHED. */
export async function updateOpeningCash(id, openingCash) {
  const { data } = await http.patch(`/shifts/${id}/opening-cash`, { openingCash });
  return unwrap(data);
}

export async function publishWeek({ branchId, weekStart }) {
  const { data } = await http.put('/shifts/week/publish', { branchId, weekStart });
  return unwrap(data);
}

export async function copyPreviousWeek({ branchId, weekStart }) {
  const { data } = await http.post('/shifts/week/copy', { branchId, weekStart });
  return unwrap(data);
}

export async function fetchWeekSetup(branchId, weekStart) {
  const { data } = await http.get('/shifts/week/setup', {
    params: { branchId, weekStart },
  });
  return unwrap(data);
}

export async function setupAndPublishWeek({ branchId, weekStart, slots }) {
  const { data } = await http.post('/shifts/week/setup-and-publish', {
    branchId,
    weekStart,
    slots,
  });
  return unwrap(data);
}

export async function fetchAvailableEmployees({ branchId, date, startTime, endTime, requiredRole }) {
  const { data } = await http.get('/employees/available', {
    params: { branchId, date, startTime, endTime, requiredRole },
  });
  return unwrap(data);
}

export async function fetchWeeklySchedule(branchId, weekStart) {
  const { data } = await http.get('/shifts/weekly', {
    params: { branchId, weekStart },
  });
  return unwrap(data);
}

export async function fetchMyWeeklySchedule(weekStart) {
  const { data } = await http.get('/shifts/my/weekly', {
    params: { weekStart },
  });
  return unwrap(data);
}

export async function fetchMyShifts() {
  const { data } = await http.get('/shifts/my');
  return unwrap(data);
}

export async function checkInShift(shiftId) {
  const { data } = await http.patch(`/shifts/${shiftId}/check-in`);
  return unwrap(data);
}
