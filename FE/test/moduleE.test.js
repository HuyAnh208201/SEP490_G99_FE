import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countShipmentDifferences,
  formatSignedDifference,
  resolveReceivedQuantity,
  shipmentDifference,
} from '../src/lib/inventoryChange.js';

test('blank received quantity means the full shipped quantity was received', () => {
  assert.equal(resolveReceivedQuantity(12, ''), 12);
  assert.equal(shipmentDifference(12, ''), 0);
});

test('shipment difference is actual received minus shipped', () => {
  assert.equal(shipmentDifference(12, '10'), -2);
  assert.equal(shipmentDifference(12, '15'), 3);
});

test('difference summary counts only rows whose quantities differ', () => {
  const items = [
    { productId: 'a', shippedQuantity: 10 },
    { productId: 'b', shippedQuantity: 8 },
    { productId: 'c', shippedQuantity: 6 },
  ];
  const form = {
    a: { received: '' },
    b: { received: '7' },
    c: { received: '9' },
  };

  assert.equal(countShipmentDifferences(items, form), 2);
});

test('signed differences are explicit and zero stays neutral', () => {
  assert.equal(formatSignedDifference(3), '+3');
  assert.equal(formatSignedDifference(-2), '-2');
  assert.equal(formatSignedDifference(0), '0');
});
