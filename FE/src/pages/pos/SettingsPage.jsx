import { useEffect, useState } from 'react';
import { updateProfile, fetchMe } from '../../api/users.js';
import { changePassword } from '../../api/password.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import PosPageTitle from './components/PosPageTitle.jsx';
import {
  normalizePhone,
  validateBirthDate,
  validateEmail,
  validateNewPassword,
  validateRequiredName,
  validateVnPhone,
  PASSWORD_MIN_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
} from '../../lib/validation.js';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
];

const inputClass =
  'w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--admin-brand)] focus:ring-2 focus:ring-[#0058be]/15';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    birthDate: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [fetching, setFetching] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        setForm({
          firstName: me.firstName || '',
          lastName: me.lastName || '',
          email: me.email || '',
          phone: me.phone || '',
          gender: me.gender || '',
          birthDate: me.birthDate ? String(me.birthDate).slice(0, 10) : '',
        });
      })
      .catch(() => {
        if (!cancelled && user) {
          setForm({
            firstName: user.firstName || user.name?.split(' ')[0] || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phone: user.phone || '',
            gender: user.gender || '',
            birthDate: '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function updateProfileField(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setProfileError('');
      setProfileSuccess('');
    };
  }

  function updatePasswordField(field) {
    return (event) => {
      setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
      setPasswordError('');
      setPasswordSuccess('');
    };
  }

  function validateProfileForm() {
    return (
      validateRequiredName(form.firstName, {
        label: 'First name',
        max: PROFILE_NAME_MAX_LENGTH,
      }) ||
      validateRequiredName(form.lastName, {
        label: 'Last name',
        max: PROFILE_NAME_MAX_LENGTH,
      }) ||
      validateEmail(form.email, { required: true }) ||
      validateVnPhone(form.phone, { required: false, label: 'Phone number' }) ||
      validateBirthDate(form.birthDate)
    );
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const validationError = validateProfileForm();
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    setProfileLoading(true);
    try {
      const phone = normalizePhone(form.phone);
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: phone || undefined,
        gender: form.gender || undefined,
        birthDate: form.birthDate || undefined,
      });
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.oldPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    const passwordErrorMessage = validateNewPassword(
      passwordForm.newPassword,
      passwordForm.confirmNewPassword,
      { oldPassword: passwordForm.oldPassword },
    );
    if (passwordErrorMessage) {
      setPasswordError(passwordErrorMessage);
      return;
    }

    setPasswordLoading(true);
    try {
      const message = await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword,
      });
      setPasswordSuccess(message || 'Password changed successfully.');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
      <PosPageTitle title="Account Settings" />

      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex gap-1 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--admin-text)] shadow-sm'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          {activeTab === 'profile' && (
            <>
              {fetching ? (
                <div className="h-40 animate-pulse rounded-xl bg-[#f0f4f8]" />
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        First name *
                      </span>
                      <input
                        required
                        maxLength={PROFILE_NAME_MAX_LENGTH}
                        value={form.firstName}
                        onChange={updateProfileField('firstName')}
                        className={inputClass}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Last name *
                      </span>
                      <input
                        required
                        maxLength={PROFILE_NAME_MAX_LENGTH}
                        value={form.lastName}
                        onChange={updateProfileField('lastName')}
                        className={inputClass}
                      />
                    </label>
                    <label className="block space-y-1 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Email *
                      </span>
                      <input
                        type="email"
                        required
                        maxLength={255}
                        value={form.email}
                        onChange={updateProfileField('email')}
                        className={inputClass}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Phone
                      </span>
                      <input
                        value={form.phone}
                        onChange={updateProfileField('phone')}
                        placeholder="0912345678 or +84912345678"
                        inputMode="tel"
                        maxLength={20}
                        className={inputClass}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Gender
                      </span>
                      <select value={form.gender} onChange={updateProfileField('gender')} className={inputClass}>
                        <option value="">—</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                    <label className="block space-y-1 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                        Birth date
                      </span>
                      <input
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={form.birthDate}
                        onChange={updateProfileField('birthDate')}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  {profileError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {profileError}
                    </p>
                  )}
                  {profileSuccess && (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {profileSuccess}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="rounded-xl bg-[var(--admin-brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:opacity-50"
                  >
                    {profileLoading ? 'Saving…' : 'Save profile'}
                  </button>
                </form>
              )}
            </>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <p className="text-sm text-[var(--admin-muted)]">
                Use a strong password you do not reuse elsewhere. Minimum {PASSWORD_MIN_LENGTH} characters.
              </p>
              <PasswordInput
                label="Current password"
                value={passwordForm.oldPassword}
                onChange={updatePasswordField('oldPassword')}
                autoComplete="current-password"
                required
                maxLength={128}
              />
              <PasswordInput
                label="New password"
                value={passwordForm.newPassword}
                onChange={updatePasswordField('newPassword')}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={128}
                hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
              />
              <PasswordInput
                label="Confirm new password"
                value={passwordForm.confirmNewPassword}
                onChange={updatePasswordField('confirmNewPassword')}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={128}
              />
              {passwordError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {passwordSuccess}
                </p>
              )}
              <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-xl bg-[var(--admin-brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-brand-hover)] disabled:opacity-50"
              >
                {passwordLoading ? 'Updating…' : 'Change password'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
