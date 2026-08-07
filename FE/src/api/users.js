import { http } from './http.js';
import { compactPageParams, unwrapPage } from './pagination.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors;
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

function normalizeUser(u) {
  if (!u) return null;
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  const status = typeof u.status === 'string' ? u.status.trim().toLowerCase() : null;
  let isActive;
  if (status) {
    isActive = status === 'active';
  } else if (typeof u.isActive === 'boolean') {
    isActive = u.isActive;
  } else if (typeof u.active === 'boolean') {
    isActive = u.active;
  } else {
    isActive = true;
  }
  return {
    ...u,
    id: u.id,
    name: fullName || u.fullName || u.userName || u.email || '—',
    username: u.userName || u.email,
    role: u.role,
    status: u.status,
    isActive,
    branchId: u.branchId,
  };
}

export async function fetchUsers() {
  const { data } = await http.get('/auth/get-list-users');
  const list = unwrap(data);
  return (Array.isArray(list) ? list : []).map(normalizeUser);
}

export async function fetchUsersPage(params = {}) {
  const { data } = await http.get('/auth/get-list-users/page', { params: compactPageParams(params) });
  return unwrapPage(data, normalizeUser);
}

export async function fetchUserById(id) {
  const { data } = await http.get('/auth/get-user-by-id', { params: { id } });
  return normalizeUser(unwrap(data));
}

export async function createUser(payload) {
  const { data } = await http.post('/auth/admin/create-user', payload);
  return normalizeUser(unwrap(data));
}

export async function updateProfile(payload) {
  const { data } = await http.post('/auth/update-profile', payload);
  return normalizeUser(unwrap(data));
}

export async function updateUserStatus(id, active, verification) {
  const { data } = await http.patch(`/auth/admin/users/${id}/status`, {
    active,
    email: verification?.email,
    verificationCode: verification?.verificationCode,
  });
  return normalizeUser(unwrap(data));
}

export async function deleteUser(id, verification) {
  if (verification?.email && verification?.verificationCode) {
    await http.delete(`/auth/admin/users/${id}`, { data: verification });
  } else {
    await http.delete(`/auth/admin/users/${id}`);
  }
}

export async function sendCriticalUserActionCode(userId, email, actionType) {
  const { data } = await http.post(`/auth/admin/users/${userId}/critical-action/send-code`, {
    email,
    actionType,
  });
  return unwrap(data);
}

export async function fetchCriticalRoleSlots() {
  const { data } = await http.get('/auth/admin/role-slots');
  return unwrap(data);
}

export async function fetchMe() {
  const { data } = await http.get('/auth/me');
  const dto = unwrap(data);
  const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim();
  return {
    ...dto,
    id: dto.id,
    name: fullName || dto.userName || 'User',
    username: dto.userName,
    role: dto.role,
    branchId: dto.branchId,
    avatar: dto.avatar ?? null,
  };
}
