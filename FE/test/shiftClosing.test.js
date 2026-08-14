import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldLoadClosingDetails, shouldRenderClosingDetails } from '../src/pages/shift/shiftClosingState.js';

test('closing details render only after a valid shift payload is loaded', () => {
  assert.equal(shouldRenderClosingDetails({ loading: true, data: null }), false);
  assert.equal(shouldRenderClosingDetails({ loading: false, data: null }), false);
  assert.equal(shouldRenderClosingDetails({ loading: false, data: { id: 12 } }), true);
});

test('closing API is called only after an active session has been resolved', () => {
  assert.equal(shouldLoadClosingDetails({ sessionLoading: true, session: null }), false);
  assert.equal(shouldLoadClosingDetails({ sessionLoading: false, session: null }), false);
  assert.equal(shouldLoadClosingDetails({ sessionLoading: false, session: { id: 12 } }), true);
});
