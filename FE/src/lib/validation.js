/**
 * Client-side rules kept in sync with BE Jakarta Validation.
 * FE blocks bad input early; BE remains the source of truth.
 */

/** Staff / profile phone — matches UpdateProfileDto / RegisterDto. */
export const VN_PHONE_PATTERN = /^(0|\+84)[0-9]{9,10}$/;

/** POS walk-in customer — matches CreateCustomerRequest after tighten. */
export const POS_CUSTOMER_PHONE_PATTERN = /^(0|\+84)[0-9]{9,10}$/;

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;
export const PROFILE_NAME_MAX_LENGTH = 50;

export function normalizePhone(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '');
}

export function isValidVnPhone(value) {
  const phone = normalizePhone(value);
  return phone.length > 0 && VN_PHONE_PATTERN.test(phone);
}

export function validateVnPhone(value, { required = false, label = 'Phone number' } = {}) {
  const phone = normalizePhone(value);
  if (!phone) {
    return required ? `${label} is required.` : null;
  }
  if (!VN_PHONE_PATTERN.test(phone)) {
    return `${label} is invalid (e.g. 0912345678 or +84912345678).`;
  }
  return null;
}

export function validateRequiredName(value, { label = 'Name', max = NAME_MAX_LENGTH } = {}) {
  const name = String(value ?? '').trim();
  if (!name) return `${label} is required.`;
  if (name.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

export function validateEmail(value, { required = true } = {}) {
  const email = String(value ?? '').trim();
  if (!email) return required ? 'Email is required.' : null;
  // Practical check; BE @Email is authoritative.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email is invalid.';
  }
  if (email.length > 255) return 'Email is too long.';
  return null;
}

export function validateNewPassword(newPassword, confirmPassword, { oldPassword } = {}) {
  const next = String(newPassword ?? '');
  const confirm = String(confirmPassword ?? '');
  if (!next) return 'New password is required.';
  if (next.length < PASSWORD_MIN_LENGTH) {
    return `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (next.length > PASSWORD_MAX_LENGTH) {
    return `New password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  }
  if (confirm !== next) {
    return 'New password and confirmation do not match.';
  }
  if (oldPassword != null && oldPassword !== '' && next === oldPassword) {
    return 'New password must be different from the current password.';
  }
  return null;
}

export function validateBirthDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Birth date is invalid.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return 'Birth date cannot be in the future.';
  return null;
}
