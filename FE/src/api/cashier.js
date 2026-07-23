import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

/** Tra cứu khách hàng khớp chính xác SĐT hoặc email → { customerId, fullName, email, phone, totalPoints }. */
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

/** Tạo nhanh khách mới tại quầy → cùng shape với lookupCustomer. */
export async function createCustomer({ fullName, phone }) {
  const { data } = await http.post('/cashier/customer', { fullName, phone });
  return unwrap(data);
}

/** Tích điểm từ hóa đơn → { customerName, customerEmail, pointsEarned, totalPoints, invoiceAmount }. */
export async function addPoints({ phoneOrEmail, invoiceAmount }) {
  const { data } = await http.post('/cashier/add-points', {
    phoneOrEmail,
    invoiceAmount,
  });
  return unwrap(data);
}
