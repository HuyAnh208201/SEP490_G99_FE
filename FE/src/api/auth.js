import { http } from './http.js';

function resolveAuthError(err, fallback) {
  // http.js may wrap API errors as Error(message) with .status (no Axios response).
  const status = err?.response?.status ?? err?.status ?? err?.code;
  const body = err?.response?.data;
  const serverMessage = typeof body === 'object' && body?.message ? body.message : null;
  const axiosGeneric = /^Request failed with status code \d+$/i.test(err?.message || '');

  if (!err?.response && (status == null || status === 'NETWORK_ERROR' || status === 'ECONNABORTED')) {
    return 'Cannot reach the backend. Start BE first on port 4313 (cd BE && mvnw.cmd spring-boot:run).';
  }
  // Vite proxy returns bare 500 when BE on :4313 is down — axios message is useless.
  if ((status === 500 || status === 502 || status === 503 || status === 504) && (!serverMessage || axiosGeneric)) {
    return 'Backend is not running on port 4313. Start BE: cd BE && mvnw.cmd spring-boot:run';
  }
  return serverMessage || (!axiosGeneric && err?.message) || fallback;
}

/**
 * Chuẩn hoá payload user từ BE (`/api/auth/me` → UserDto) sang shape FE dùng.
 * @param {Record<string, any> | null} dto
 */
function toProfile(dto) {
  if (!dto) return null;
  const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim();
  return {
    ...dto,
    id: dto.id,
    name: fullName || dto.userName || 'User',
    username: dto.userName,
    role: dto.role,
    branchId: dto.branchId ?? dto.branch_id ?? null,
    avatar: dto.avatar ?? null,
  };
}

/**
 * Đăng nhập thật qua BE: POST /api/auth/login → lấy accessToken,
 * sau đó GET /api/auth/me để lấy hồ sơ user.
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: object | null }>}
 */
export async function login({ username, password }) {
  let token;
  try {
    const { data: body } = await http.post('/auth/login', { username, password });
    token = body?.data?.accessToken;
    if (!body?.success || !token) {
      throw new Error(body?.message || 'Login failed');
    }
  } catch (err) {
    const message = resolveAuthError(err, 'Login failed');
    const wrapped = new Error(message);
    wrapped.code = err?.response?.status ?? 'NETWORK_ERROR';
    throw wrapped;
  }

  // Persist before /auth/me so the interceptor cannot reuse a previous session token.
  localStorage.setItem('chainstore_token', token);

  let user = null;
  try {
    const { data: meBody } = await http.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    user = toProfile(meBody?.data);
  } catch {
    user = { name: username, username };
  }

  return { token, user };
}

/**
 * BE dùng JWT stateless nên không có endpoint logout — chỉ cần xoá token phía client.
 */
export async function logout() {
  return { ok: true };
}
