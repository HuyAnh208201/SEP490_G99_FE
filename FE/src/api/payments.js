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

/**
 * Xin payOS tạo link + QR cho đơn đang chờ thanh toán.
 * Trả { orderId, orderCode, amount, checkoutUrl, qrCode, status }.
 */
export async function createPaymentLink(orderId) {
  const { data } = await http.post('/payment/create-link', { orderId });
  return unwrap(data);
}

/**
 * Hỏi payOS trạng thái giao dịch: PENDING / PAID / CANCELLED / EXPIRED.
 * Webhook không gọi được vào máy local nên đây là đường chính để chốt đơn;
 * server tự chuyển đơn sang COMPLETED khi payOS báo PAID.
 */
export async function fetchPaymentStatus(orderCode) {
  const { data } = await http.get(`/payment/status/${orderCode}`);
  return unwrap(data);
}

/** Khách không trả tiền → hủy link, server hoàn kho và đảo điểm của đơn. */
export async function cancelPaymentLink(orderCode) {
  const { data } = await http.post(`/payment/cancel/${orderCode}`);
  return unwrap(data);
}
