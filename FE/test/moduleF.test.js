import test from 'node:test';
import assert from 'node:assert/strict';
import { toDraftPayload } from '../src/lib/purchaseRequestMappers.js';

test('purchase request sends the business desired receive date', () => {
  const payload = toDraftPayload({
    reason: 'Fast sellers',
    desiredReceiveDate: '2026-08-20',
    items: [{ productId: 7, requestedQuantity: 3 }],
  });

  assert.equal(payload.desiredReceiveDate, '2026-08-20');
  assert.deepEqual(payload.items, [{ productId: 7, requestedQty: 3 }]);
});

test('empty desired date is sent as null instead of overloading createdAt', () => {
  const payload = toDraftPayload({ reason: '', items: [] });
  assert.equal(payload.desiredReceiveDate, null);
});
