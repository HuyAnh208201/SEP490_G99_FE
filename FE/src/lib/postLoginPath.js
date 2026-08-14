import { normalizeWebRole } from '../constants/userRoles.js';

/** Default landing route after login, based on role. */
export function postLoginPath(user, fallback = '/dashboard') {
  const role = normalizeWebRole(user?.role);
  if (role === 'CASHIER') return '/pos';
  if (role === 'INVENTORY_STAFF') return '/catalog/products';
  if (role === 'ADMIN') return '/users';
  return fallback;
}

/** Honor a pre-login redirect only when it still matches the new role's app. */
export function isSafeReturnPath(from, user) {
  if (!from || from === '/login') return false;
  const role = normalizeWebRole(user?.role);
  const isPos = from === '/pos' || from.startsWith('/pos/');
  if (role === 'CASHIER') return isPos;
  if (isPos) return false;
  if (role === 'ADMIN' && (from === '/dashboard' || from.startsWith('/dashboard'))) return false;
  return true;
}
