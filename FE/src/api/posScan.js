import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

/**
 * Thiết bị phụ (điện thoại) gửi mã vừa quét sang máy bán hàng.
 * Trả về ProductResponse để điện thoại hiển thị ngay đã gửi sản phẩm gì.
 */
export async function pushScanEvent(barcode) {
  const { data } = await http.post('/pos/scan-events', { barcode });
  return unwrap(data);
}

/**
 * Máy bán hàng hỏi các mã mới.
 * Gọi lần đầu KHÔNG truyền afterId để lấy con trỏ hiện tại (không nuốt lại mã cũ).
 * → { latestId, events: [{ id, barcode, productId, productName, createdAt }] }
 */
export async function fetchScanEvents(afterId) {
  const { data } = await http.get('/pos/scan-events', {
    params: afterId == null ? {} : { afterId },
  });
  return unwrap(data);
}
