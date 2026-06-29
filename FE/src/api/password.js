import { http } from './http.js';

function throwApiError(err, fallback) {
  const message =
    err?.response?.data?.message || err?.message || fallback;
  const wrapped = new Error(message);
  wrapped.code = err?.response?.status ?? 'NETWORK_ERROR';
  throw wrapped;
}

/**
 * Bước 1 quên mật khẩu: POST /api/auth/forgot-password/initiate
 * @param {{ contactInfo: string }} payload — email hoặc username
 */
export async function initiateForgotPassword({ contactInfo }) {
  try {
    const { data: body } = await http.post('/auth/forgot-password/initiate', {
      contactInfo,
    });
    if (!body?.success) {
      throw new Error(body?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
    }
    return body.data;
  } catch (err) {
    throwApiError(err, 'Không thể gửi yêu cầu đặt lại mật khẩu');
  }
}

/**
 * Bước 2 quên mật khẩu: POST /api/auth/forgot-password/complete
 * @param {{ resetToken: string, newPassword: string, confirmNewPassword: string }} payload
 */
export async function completeForgotPassword({
  resetToken,
  newPassword,
  confirmNewPassword,
}) {
  try {
    const { data: body } = await http.post('/auth/forgot-password/complete', {
      resetToken,
      newPassword,
      confirmNewPassword,
    });
    if (!body?.success) {
      throw new Error(body?.message || 'Đặt lại mật khẩu thất bại');
    }
    return body.data ?? body.message;
  } catch (err) {
    throwApiError(err, 'Đặt lại mật khẩu thất bại');
  }
}

/**
 * Đổi mật khẩu khi đã đăng nhập: POST /api/auth/change-password
 * @param {{ oldPassword: string, newPassword: string, confirmNewPassword: string }} payload
 */
export async function changePassword({
  oldPassword,
  newPassword,
  confirmNewPassword,
}) {
  try {
    const { data: body } = await http.post('/auth/change-password', {
      oldPassword,
      newPassword,
      confirmNewPassword,
    });
    if (!body?.success) {
      throw new Error(body?.message || 'Đổi mật khẩu thất bại');
    }
    return body.data ?? body.message;
  } catch (err) {
    throwApiError(err, 'Đổi mật khẩu thất bại');
  }
}
