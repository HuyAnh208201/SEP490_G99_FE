import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

/** Tỉ lệ tích/đổi điểm do server quyết định → { vndPerPoint, pointValueVnd }. */
export async function fetchLoyaltyConfig() {
  const { data } = await http.get('/cashier/loyalty-config');
  return unwrap(data);
}

/** Tra cứu khách hàng khớp chính xác SĐT hoặc email → { customerId, fullName, email, phone, totalPoints, tierCode, tierName }. */
export async function lookupCustomer(phoneOrEmail) {
  const { data } = await http.get('/cashier/customer', {
    params: { phoneOrEmail },
  });
  return unwrap(data);
}

/** Tìm khách theo một phần SĐT / email / tên → mảng tối đa 10 gợi ý (rỗng nếu không khớp). */
export async function searchCustomers(keyword) {
  const { data } = await http.get('/cashier/customers', {
    params: { keyword },
  });
  return unwrap(data) ?? [];
}

/**
 * Chốt điểm cho hoá đơn: trừ điểm khách đổi rồi cộng điểm kiếm được, trong cùng
 * một transaction phía BE.
 * → { customerName, customerEmail, pointsRedeemed, pointsEarned, totalPoints, invoiceAmount }
 */
export async function addPoints({ phoneOrEmail, invoiceAmount, pointsToRedeem = 0 }) {
  const { data } = await http.post('/cashier/add-points', {
    phoneOrEmail,
    invoiceAmount,
    pointsToRedeem,
  });
  return unwrap(data);
}
