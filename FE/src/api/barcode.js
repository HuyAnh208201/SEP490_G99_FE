import { http } from './http.js';

function unwrap(body) {
  if (!body?.success) {
    const error = new Error(body?.message || 'Unable to scan barcode.');
    error.status = body?.statusCode;
    throw error;
  }
  return body.data;
}

export async function scanBarcode(barcode) {
  const { data } = await http.post('/barcode/scan', { barcode });
  return unwrap(data);
}
