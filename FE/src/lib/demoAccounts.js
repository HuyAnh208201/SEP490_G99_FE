/** Demo account emails mirrored from BE DemoAccounts. */

export const DEMO_IS_EMAIL = 'demo_is@chainstore.vn';
export const DEMO_CASHIER_EMAIL = 'demo_cashier@chainstore.vn';

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Inventory count hours bypass for the demo IS account. */
export function isDemoIsEmail(email) {
  return normalizeEmail(email) === DEMO_IS_EMAIL;
}
