import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/password.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { postLoginPath } from '../../lib/postLoginPath.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
    <div className="mx-auto max-w-lg">
      <PageHeader title="Change password" />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              {success}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" loading={loading}>
              Save new password
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(postLoginPath(user))}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
