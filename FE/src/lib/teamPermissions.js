import { normalizeWebRole } from '../constants/userRoles.js';

export function canManageTeamMember(actorRole, actorBranchId, targetUser, currentUserId) {
  if (!targetUser || !actorRole) return false;
  if (String(targetUser.id) === String(currentUserId)) return false;

  const actor = normalizeWebRole(actorRole);
  const target = normalizeWebRole(targetUser.role);

  if (actor === 'ADMIN') {
    return target !== 'ADMIN';
  }
  if (actor === 'DIRECTOR') {
    return target !== 'ADMIN';
  }
  if (actor === 'BRANCH_MANAGER') {
    return (
      (target === 'CASHIER' || target === 'INVENTORY_STAFF') &&
      actorBranchId != null &&
      String(targetUser.branchId) === String(actorBranchId)
    );
  }
  return false;
}
