/** Build a printable receipt model from a POS OrderResponse. */

export function receiptViewModel(order = {}) {
  const paymentMethod = String(order.paymentMethod || '').toUpperCase();
  const isCash = paymentMethod === 'CASH';
  const lines = (order.lines || []).map((line) => {
    const quantity = Number(line.quantity ?? line.qty ?? 0);
    const unitPrice = Number(line.unitPrice ?? 0);
    return {
      name: line.productName || line.name || '',
      quantity,
      unitPrice,
      lineTotal: Number(line.lineTotal ?? unitPrice * quantity),
    };
  });

  return {
    brand: 'ChainStore',
    branchName: order.branchName || '',
    branchAddress: order.branchAddress || '',
    branchPhone: order.branchPhone || '',
    invoiceCode: order.invoiceCode || '',
    createdAt: order.createdAt || null,
    cashierName: order.cashierName || '',
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    walkIn: !order.customerName,
    lines,
    subtotal: Number(order.subtotal ?? 0),
    discountAmount: Number(order.discountAmount ?? 0),
    total: Number(order.total ?? 0),
    paymentMethod,
    paymentLabel:
      paymentMethod === 'PAYOS' ? 'PayOS' : paymentMethod === 'CASH' ? 'Cash' : paymentMethod || '—',
    isCash,
    cashReceived: isCash ? Number(order.cashReceived ?? 0) : null,
    changeAmount: isCash ? Number(order.changeAmount ?? 0) : null,
    pointsRedeemed: Number(order.pointsRedeemed ?? 0),
    pointsEarned: Number(order.pointsEarned ?? 0),
  };
}

export function formatReceiptWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
