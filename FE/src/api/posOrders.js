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
 * Chốt đơn tại quầy. Cố ý chỉ gửi productId + số lượng: giá, tiền giảm và tổng
 * tiền đều do server tính lại từ DB.
 */
export async function checkout({
  lines,
  paymentMethod,
  cashReceived,
  customerPhone,
  customerName,
  voucherCode,
  pointsToRedeem,
}) {
  const { data } = await http.post('/pos/orders', {
    lines,
    paymentMethod,
    cashReceived: cashReceived ?? null,
    customerPhone: customerPhone || null,
    customerName: customerName || null,
    voucherCode: voucherCode || null,
    pointsToRedeem: pointsToRedeem ?? 0,
  });
  return unwrap(data);
}

/** Lịch sử đơn của chi nhánh; bỏ trống from/to thì lấy 50 đơn gần nhất. */
export async function fetchOrders({ from, to } = {}) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await http.get('/pos/orders', { params });
  return unwrap(data) ?? [];
}

/** Tra mã giảm giá trước khi chốt đơn. */
export async function lookupVoucher(code) {
  const { data } = await http.get(`/pos/orders/vouchers/${encodeURIComponent(code)}`);
  return unwrap(data);
}

/**
 * Cashier xin hoàn/huỷ một đơn (chỉ hợp lệ trong 5 phút sau khi tạo — server
 * kiểm lại). Trả RefundResponse ở trạng thái PENDING chờ BM duyệt.
 */
export async function requestRefund(orderId, reason) {
  const { data } = await http.post(`/pos/orders/${orderId}/refund-request`, { reason });
  return unwrap(data);
}

/** Các yêu cầu hoàn đơn đang chờ duyệt của chi nhánh BM. */
export async function fetchPendingRefunds() {
  const { data } = await http.get('/pos/refunds/pending');
  return unwrap(data) ?? [];
}

/** BM duyệt yêu cầu hoàn đơn → server hoàn kho, thu hồi điểm, đơn thành REFUNDED. */
export async function approveRefund(refundId, note) {
  const { data } = await http.post(`/pos/refunds/${refundId}/approve`, { note });
  return unwrap(data);
}

/** BM từ chối yêu cầu hoàn đơn → đơn giữ nguyên. */
export async function rejectRefund(refundId, note) {
  const { data } = await http.post(`/pos/refunds/${refundId}/reject`, { note });
  return unwrap(data);
}
