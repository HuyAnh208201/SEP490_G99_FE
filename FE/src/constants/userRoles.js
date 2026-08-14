/**
 * Role helpers aligned with BE UserRole (canAssignRole, requiresBranch, toWebRole).
 */

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  DIRECTOR: 'Director',
  PROMOTION_DIRECTOR: 'Promotion director',
  BRANCH_MANAGER: 'Branch manager',
  WAREHOUSE_MANAGER: 'Warehouse manager',
  INVENTORY_STAFF: 'Inventory staff',
  CASHIER: 'Cashier',
  CUSTOMER: 'Customer',
  OWNER: 'Owner',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const WEB_ASSIGNABLE = [
  'ADMIN',
  'DIRECTOR',
  'WAREHOUSE_MANAGER',
  'BRANCH_MANAGER',
  'INVENTORY_STAFF',
  'CASHIER',
];

/** Map legacy / alias roles to web dashboard role. */
export function normalizeWebRole(role) {
  if (role === 'MANAGER') return 'BRANCH_MANAGER';
  if (role === 'OWNER' || role === 'PROMOTION_DIRECTOR') return 'DIRECTOR';
  return role;
}

/** Roles that must include branchId on create (BE requiresBranch). */
export function requiresBranch(role) {
  return ['BRANCH_MANAGER', 'INVENTORY_STAFF', 'CASHIER'].includes(role);
}

/** Mirror BE UserRole.canAssignRole */
export function canAssignRole(actorRole, targetRole) {
  if (!targetRole) return false;
  const creator = normalizeWebRole(actorRole);
  const target = normalizeWebRole(targetRole);
  if (creator === 'ADMIN') return true;
  if (creator === 'DIRECTOR') return target !== 'ADMIN';
  if (creator === 'BRANCH_MANAGER') {
    return (
      target === 'INVENTORY_STAFF' || target === 'CASHIER' || target === 'BRANCH_MANAGER'
    );
  }
  return false;
}

export function getAssignableRoles(actorRole) {
  return WEB_ASSIGNABLE.filter((role) => canAssignRole(actorRole, role));
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '—';
}

/** BE phone pattern: 0xxxxxxxxx or +84xxxxxxxxx */
export const PHONE_PATTERN = '^(0|\\+84)[0-9]{9,10}$';

export function buildCreateUserPayload(form) {
  const payload = {
    userName: form.userName?.trim(),
    email: form.email?.trim(),
    firstName: form.firstName?.trim(),
    lastName: form.lastName?.trim() || undefined,
    phone: form.phone?.trim(),
    role: form.role,
  };
  if (requiresBranch(form.role) && form.branchId) {
    payload.branchId = Number(form.branchId);
  }
  return payload;
}
