import test from 'node:test';
import assert from 'node:assert/strict';

import { formatReceiptWhen, receiptViewModel } from '../src/lib/posReceipt.js';

const cashOrder = {
  invoiceCode: 'INV-2026-000123',
  createdAt: '2026-08-14T18:30:00',
  cashierName: 'Nguyen Thu Ngan',
  branchName: 'ChainStore Quan 1',
  branchAddress: '123 Nguyen Hue',
  branchPhone: '02811110001',
  customerName: 'Khach Hang Mot',
  customerPhone: '0911111111',
  subtotal: 24000,
  discountAmount: 3000,
  total: 21000,
  paymentMethod: 'CASH',
  cashReceived: 50000,
  changeAmount: 29000,
  pointsRedeemed: 3,
  pointsEarned: 2,
  lines: [
    { productName: 'Sua tuoi', quantity: 2, unitPrice: 12000, lineTotal: 24000 },
  ],
};

test('cash receipt includes invoice, totals, cash and change', () => {
  const receipt = receiptViewModel(cashOrder);

  assert.equal(receipt.brand, 'ChainStore');
  assert.equal(receipt.invoiceCode, 'INV-2026-000123');
  assert.equal(receipt.branchName, 'ChainStore Quan 1');
  assert.equal(receipt.cashierName, 'Nguyen Thu Ngan');
  assert.equal(receipt.customerName, 'Khach Hang Mot');
  assert.equal(receipt.walkIn, false);
  assert.equal(receipt.lines.length, 1);
  assert.equal(receipt.lines[0].name, 'Sua tuoi');
  assert.equal(receipt.subtotal, 24000);
  assert.equal(receipt.discountAmount, 3000);
  assert.equal(receipt.total, 21000);
  assert.equal(receipt.isCash, true);
  assert.equal(receipt.paymentLabel, 'Cash');
  assert.equal(receipt.cashReceived, 50000);
  assert.equal(receipt.changeAmount, 29000);
  assert.equal(receipt.pointsRedeemed, 3);
  assert.equal(receipt.pointsEarned, 2);
});

test('PayOS receipt has no cash received or change', () => {
  const receipt = receiptViewModel({
    invoiceCode: 'INV-2026-000124',
    paymentMethod: 'PAYOS',
    total: 40000,
    subtotal: 40000,
    discountAmount: 0,
    lines: [{ productName: 'Aqua 500ml', quantity: 2, unitPrice: 20000, lineTotal: 40000 }],
  });

  assert.equal(receipt.isCash, false);
  assert.equal(receipt.paymentLabel, 'PayOS');
  assert.equal(receipt.cashReceived, null);
  assert.equal(receipt.changeAmount, null);
  assert.equal(receipt.walkIn, true);
  assert.equal(receipt.total, 40000);
});

test('receipt date formats in en-GB', () => {
  assert.equal(formatReceiptWhen(null), '—');
  assert.match(formatReceiptWhen('2026-08-14T18:30:00'), /14\/08\/2026/);
});
