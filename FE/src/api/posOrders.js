import { http } from './http.js';

import { compactPageParams, unwrapPage } from './pagination.js';

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
 * Complete a POS checkout. Prices, discounts, totals and stock are recalculated by the server.
 */
export async function checkout({
  lines,
  paymentMethod,
  cashReceived,
  customerPhone,
  customerName,
  pointsToRedeem,
  campaignId,
}) {
  const { data } = await http.post('/pos/orders', {
    lines,
    paymentMethod,
    cashReceived: cashReceived ?? null,
    customerPhone: customerPhone || null,
    customerName: customerName || null,
    pointsToRedeem: pointsToRedeem ?? 0,
    campaignId: campaignId ?? null,
  });
  return unwrap(data);
}

/** Active campaigns for the cashier branch with eligibility vs current subtotal. */
export async function fetchApplicablePromotions(subtotal) {
  const { data } = await http.get('/pos/orders/applicable-promotions', {
    params: { subtotal: subtotal ?? 0 },
  });
  return unwrap(data) ?? [];
}

/** Return orders from the cashier's current shift. */
export async function fetchOrders({ from, to } = {}) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await http.get('/pos/orders', { params });
  return unwrap(data) ?? [];
}

/** Return a page of orders from the cashier's current shift. */
export async function fetchOrdersPage(params = {}) {
  const { data } = await http.get('/pos/orders/page', { params: compactPageParams(params) });
  return unwrapPage(data);
}

/**
 * Refund a full order immediately at POS. The server validates the current shift, branch,
 * five-minute window and refundable product snapshot before restoring stock and loyalty points.
 */
export async function requestRefund(orderId, reason) {
  const { data } = await http.post(`/pos/orders/${orderId}/refund-request`, { reason });
  return unwrap(data);
}
