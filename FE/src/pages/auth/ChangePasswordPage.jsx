import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { changePassword } from '../../api/password.js';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';
import Logo from '../../components/brand/Logo.jsx';

export default function ChangePasswordPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError('Password confirmation does not match');
      return;
    }

    setLoading(true);
    try {
      const message = await changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      });
      setSuccess(
        typeof message === 'string' ? message : 'Password changed successfully',
      );
      setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <p className="text-sm font-semibold text-slate-900">ChainStore</p>
            <p className="text-xs text-slate-500">Chain Store Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Dashboard
          </button>
          <span className="text-sm text-slate-600">
            Hello, <strong>{user?.name || 'User'}</strong>
          </span>
          <Button variant="ghost" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-8 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Change password
        </h1>
        <p className="mt-2 text-slate-600">
          Update your account password. The new password must be at least 6 characters.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <PasswordInput
            label="Current password"
            value={form.oldPassword}
            onChange={updateField('oldPassword')}
            autoComplete="current-password"
            required
          />

          <PasswordInput
            label="New password"
            value={form.newPassword}
            onChange={updateField('newPassword')}
            autoComplete="new-password"
            required
            minLength={6}
            hint="At least 6 characters"
          />

          <PasswordInput
            label="Confirm new password"
            value={form.confirmNewPassword}
            onChange={updateField('confirmNewPassword')}
            autoComplete="new-password"
            required
            minLength={6}
          />

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              {success}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Save new password
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
