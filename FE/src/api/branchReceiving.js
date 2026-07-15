import { http } from './http.js';

/**
 * API layer cho nhập kho thực tế của nhân viên kho chi nhánh (mục 2.6).
 * BE bọc response trong { success, data, message, statusCode }.
 */

const BASE = '/branch-receiving';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.errors = body?.errors ?? body?.data;
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

function asList(data) {
  if (Array.isArray(data)) return data;
  if (data?.listObjects) return data.listObjects;
  return [];
}

/** Danh sách lô vận chuyển về chi nhánh (Order Tracking). */
export async function listIncomingOrders() {
  const { data } = await http.get(`${BASE}/orders`);
  return asList(unwrap(data));
}

/** Chi tiết một lô/yêu cầu để nhập kho (Receive Shipment). */
export async function getShipmentDetail(dispatchOrderId, requestId) {
  const { data } = await http.get(`${BASE}/orders/${dispatchOrderId}/requests/${requestId}`);
  return unwrap(data);
}

/** Xác nhận số lượng thực nhận. */
export async function receiveShipment(dispatchOrderId, requestId, items) {
  const { data } = await http.post(
    `${BASE}/orders/${dispatchOrderId}/requests/${requestId}/receive`,
    { items },
  );
  return unwrap(data);
}

/** Lịch sử nhập kho (Receiving History). */
export async function listReceivingHistory() {
  const { data } = await http.get(`${BASE}/receipts`);
  return asList(unwrap(data));
}

export async function getReceiptDetail(receiptId) {
  const { data } = await http.get(`${BASE}/receipts/${receiptId}`);
  return unwrap(data);
}
