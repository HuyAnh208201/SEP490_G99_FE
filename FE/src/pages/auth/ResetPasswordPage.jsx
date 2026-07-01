import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { completeForgotPassword } from '../../api/password.js';
import AuthPageLayout from '../../components/layout/AuthPageLayout.jsx';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);

  const [form, setForm] = useState({ newPassword: '', confirmNewPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetToken) {
      setError('The password reset link is invalid or missing a token');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError('Password confirmation does not match');
      return;
    }

    setLoading(true);
    try {
      const message = await completeForgotPassword({
        resetToken,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      });
      setSuccess(
        typeof message === 'string'
          ? message
          : 'Password reset successful. You can now sign in with your new password.',
      );
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (!resetToken) {
    return (
      <AuthPageLayout
        title="Invalid link"
        subtitle="The password reset token is missing or has expired"
        footer={
          <Link to="/forgot-password" className="text-sm font-bold text-[#0058be] hover:underline">
            Request a new link
          </Link>
        }
      >
        <div
          role="alert"
          className="rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-sm text-[#93000a]"
        >
          Please open the link from your email or request a new password reset link.
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      title="Reset password"
      subtitle="Enter a new password for your account"
      footer={
        <Link to="/login" className="text-sm font-bold text-[#0058be] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <PasswordField
          id="newPassword"
          label="New password"
          value={form.newPassword}
          onChange={updateField('newPassword')}
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
          disabled={loading || Boolean(success)}
        />

        <PasswordField
          id="confirmNewPassword"
          label="Confirm new password"
          value={form.confirmNewPassword}
          onChange={updateField('confirmNewPassword')}
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          autoComplete="new-password"
          disabled={loading || Boolean(success)}
        />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-sm text-[#93000a]"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-[#b7f397]/60 bg-[#e8ffd9]/50 px-3 py-2 text-sm text-[#1b5e20]"
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || Boolean(success)}
          className="w-full rounded-lg border-t border-white/10 bg-[#0058be] py-3 text-xs font-bold uppercase tracking-[0.05em] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Reset password'}
        </button>
      </form>
    </AuthPageLayout>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  disabled,
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-[#191c1e]"
      >
        {label}
      </label>
      <div className="group relative flex items-center rounded-lg border border-[#c6c6cd] bg-white transition-all focus-within:border-[#0058be] focus-within:shadow-[0_0_0_3px_rgba(0,88,190,0.2)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="absolute left-3 h-5 w-5 text-[#76777d] transition-colors group-focus-within:text-[#0058be]"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          disabled={disabled}
          required
          minLength={6}
          className="w-full border-none bg-transparent py-3 pl-11 pr-11 text-base placeholder:text-[#c6c6cd] focus:outline-none focus:ring-0 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 text-[#76777d] transition-colors hover:text-[#191c1e]"
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3l18 18M10.6 6.1A10.5 10.5 0 0 1 12 6c5 0 9 4 10 6-.5 1-1.7 2.7-3.5 4.1M6.5 6.5C4.7 7.9 3.5 9.6 3 11c.9 1.8 4.4 6 9 6 1.4 0 2.7-.4 3.8-1M9.9 9.9a3 3 0 0 0 4.2 4.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
