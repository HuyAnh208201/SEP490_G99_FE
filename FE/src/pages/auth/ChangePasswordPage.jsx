import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/password.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/ui/PasswordInput.jsx';

export default function ChangePasswordPage() {
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const message = await changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      });
      setSuccess(typeof message === 'string' ? message : 'Đổi mật khẩu thành công');
      setForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Đổi mật khẩu"
        description="Cập nhật mật khẩu tài khoản. Mật khẩu mới cần ít nhất 6 ký tự."
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <PasswordInput
            label="Mật khẩu hiện tại"
            value={form.oldPassword}
            onChange={updateField('oldPassword')}
            autoComplete="current-password"
            required
          />

          <PasswordInput
            label="Mật khẩu mới"
            value={form.newPassword}
            onChange={updateField('newPassword')}
            autoComplete="new-password"
            required
            minLength={6}
            hint="Tối thiểu 6 ký tự"
          />

          <PasswordInput
            label="Xác nhận mật khẩu mới"
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
              Lưu mật khẩu mới
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
              Huỷ
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
