import { normalizeWebRole } from '../constants/userRoles.js';

/** Default landing route after login, based on role. */
export function postLoginPath(user, fallback = '/dashboard') {
  const role = normalizeWebRole(user?.role);
  if (role === 'CASHIER') return '/pos';
  return fallback;
}
