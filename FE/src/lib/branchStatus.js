export const BRANCH_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
};

export function normalizeBranchStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'ACTIVE') return BRANCH_STATUS.ACTIVE;
  if (s === 'SUSPENDED' || s === 'INACTIVE') return BRANCH_STATUS.SUSPENDED;
  return s || BRANCH_STATUS.ACTIVE;
}

export function branchStatusLabel(status) {
  const normalized = normalizeBranchStatus(status);
  if (normalized === BRANCH_STATUS.ACTIVE) return 'Active';
  if (normalized === BRANCH_STATUS.SUSPENDED) return 'Deactivated';
  return normalized;
}

export function branchStatusTone(status) {
  return normalizeBranchStatus(status) === BRANCH_STATUS.ACTIVE ? 'success' : 'danger';
}

export function toggleBranchStatus(status) {
  return normalizeBranchStatus(status) === BRANCH_STATUS.ACTIVE
    ? BRANCH_STATUS.SUSPENDED
    : BRANCH_STATUS.ACTIVE;
}
