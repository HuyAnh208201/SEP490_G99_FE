import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const err = new Error(body?.message || 'Request failed');
    err.status = body?.statusCode;
    throw err;
  }
  return body.data;
}

/** Tra cứu khách hàng theo SĐT hoặc email → { customerId, fullName, email, phone, totalPoints }. */
export async function lookupCustomer(phoneOrEmail) {
  const { data } = await http.get('/cashier/customer', {
    params: { phoneOrEmail },
  });
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
