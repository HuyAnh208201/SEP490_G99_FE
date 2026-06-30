import { http } from './http.js';

/**
 * Chuẩn hoá payload user từ BE (`/api/auth/me` → UserDto) sang shape FE dùng.
 * @param {Record<string, any> | null} dto
 */
function toProfile(dto) {
  if (!dto) return null;
  const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim();
  return {
    ...dto,
    name: fullName || dto.userName || 'User',
    username: dto.userName,
    role: dto.role,
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
    const message =
      err?.response?.data?.message || err?.message || 'Login failed';
    const wrapped = new Error(message);
    wrapped.code = err?.response?.status ?? 'NETWORK_ERROR';
    throw wrapped;
  }

  // Lấy hồ sơ user — gửi kèm token vì interceptor chưa đọc được từ localStorage tại thời điểm này.
  let user = null;
  try {
    const { data: meBody } = await http.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    user = toProfile(meBody?.data);
  } catch {
    // Không chặn đăng nhập nếu /me lỗi — vẫn cho vào với token hợp lệ.
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
