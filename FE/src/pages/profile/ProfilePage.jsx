import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { updateProfile, fetchMe } from '../../api/users.js';
import { changePassword } from '../../api/password.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';
import {
  normalizePhone,
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
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function ProfilePage() {
  const { user, updateCurrentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'security' ? 'security' : 'profile';

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
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
          fullName: [me.firstName, me.lastName].filter(Boolean).join(' ').trim(),
          email: me.email || '',
          phone: me.phone || '',
        });
      })
      .catch(() => {
        if (!cancelled && user) {
          setForm({
            fullName: user.fullName || user.name || '',
            email: user.email || '',
            phone: user.phone || '',
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

  function setTab(tab) {
    setSearchParams(tab === 'profile' ? {} : { tab });
  }

  function updateProfileField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updatePasswordField(field) {
    return (e) => setPasswordForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const fullName = form.fullName.trim().replace(/\s+/g, ' ');
    const splitAt = fullName.indexOf(' ');
    const validationError =
      validateRequiredName(fullName, {
        label: 'Full name',
        max: PROFILE_NAME_MAX_LENGTH,
      }) ||
      (splitAt < 0 ? 'Full name must contain at least two words.' : null) ||
      validateVnPhone(form.phone, { required: false, label: 'Phone number' });
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    setProfileLoading(true);
    try {
      const phone = normalizePhone(form.phone);
      // The API still takes firstName/lastName separately and joins them with one
      // space into the single stored name, so split here to keep what the user typed.
      // Không gửi email: UpdateProfileDto bên BE không còn nhận trường này nữa.
      await updateProfile({
        firstName: fullName.slice(0, splitAt),
        lastName: fullName.slice(splitAt + 1),
        phone: phone || undefined,
      });
      const refreshed = await fetchMe();
      updateCurrentUser(refreshed);
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Unable to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
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
      setPasswordSuccess(typeof message === 'string' ? message : 'Password changed successfully.');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Account settings"
        description="Manage your profile and account security."
        badge={
          user?.role ? (
            <Badge tone="brand">{ROLE_LABELS[user.role] || user.role}</Badge>
          ) : null
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
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

      <Card>
        {activeTab === 'profile' && (
          <>
            {fetching ? (
              <div className="h-40 animate-pulse rounded-lg bg-[#f0f4f8]" />
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      Full name *
                    </span>
                    <input
                      required
                      maxLength={PROFILE_NAME_MAX_LENGTH}
                      value={form.fullName}
                      onChange={updateProfileField('fullName')}
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      Email
                    </span>
                    {/* Chỉ đọc, cùng kiểu ô Branch bị khoá ở CreateUserModal. Email là địa
                        chỉ nhận link đặt lại mật khẩu nên không cho tự đổi ở màn hình này. */}
                    <input
                      readOnly
                      value={form.email}
                      className={`${inputClass} bg-[#f7f9fb]`}
                    />
                    <p className="text-xs text-[var(--admin-muted)]">
                      Your email is used for account recovery and cannot be changed here.
                    </p>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                      Phone
                    </span>
                    <input
                      value={form.phone}
                      onChange={updateProfileField('phone')}
                      className={inputClass}
                    />
                  </label>
                </div>

                {profileError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {profileSuccess}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" loading={profileLoading}>
                    Save profile
                  </Button>
                </div>
              </form>
            )}
          </>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
            <p className="text-sm text-[var(--admin-muted)]">
                Use a strong password you do not reuse elsewhere. Minimum {PASSWORD_MIN_LENGTH} characters.
            </p>

            <PasswordInput
              label="Current password"
              value={passwordForm.oldPassword}
              onChange={updatePasswordField('oldPassword')}
              autoComplete="current-password"
              required
            />
            <PasswordInput
              label="New password"
              value={passwordForm.newPassword}
              onChange={updatePasswordField('newPassword')}
              autoComplete="new-password"
              required
              minLength={6}
              hint="At least 6 characters"
            />
            <PasswordInput
              label="Confirm new password"
              value={passwordForm.confirmNewPassword}
              onChange={updatePasswordField('confirmNewPassword')}
              autoComplete="new-password"
              required
              minLength={6}
            />

            {passwordError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {passwordSuccess}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" loading={passwordLoading}>
                Update password
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
