import { useState } from 'react';
import { Link } from 'react-router-dom';
import { initiateForgotPassword } from '../../api/password.js';
import AuthPageLayout from '../../components/layout/AuthPageLayout.jsx';

export default function ForgotPasswordPage() {
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = contactInfo.trim();
    if (!trimmed) {
      setError('Vui lòng nhập email hoặc tên đăng nhập');
      return;
    }

    setLoading(true);
    try {
      const data = await initiateForgotPassword({ contactInfo: trimmed });
      setSuccess(
        data?.message ||
          'Link đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
      );
      setContactInfo('');
    } catch (err) {
      setError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout
      title="Quên mật khẩu"
      subtitle="Nhập email hoặc tên đăng nhập để nhận link đặt lại mật khẩu"
      footer={
        <p className="text-sm text-[#45464d]">
          Nhớ mật khẩu?{' '}
          <Link to="/login" className="font-bold text-[#0058be] hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="space-y-1">
          <label
            htmlFor="contactInfo"
            className="text-xs font-semibold uppercase tracking-wider text-[#191c1e]"
          >
            Email hoặc tên đăng nhập
          </label>
          <div className="group relative flex items-center rounded-lg border border-[#c6c6cd] bg-white transition-all focus-within:border-[#0058be] focus-within:shadow-[0_0_0_3px_rgba(0,88,190,0.2)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="absolute left-3 h-5 w-5 text-[#76777d] transition-colors group-focus-within:text-[#0058be]"
            >
              <path
                d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="m2 7 10 6 10-6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              id="contactInfo"
              type="text"
              autoComplete="username email"
              placeholder="admin hoặc email@example.com"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              disabled={loading || Boolean(success)}
              className="w-full border-none bg-transparent py-3 pl-11 pr-3 text-base placeholder:text-[#c6c6cd] focus:outline-none focus:ring-0 disabled:opacity-60"
            />
          </div>
        </div>

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
          {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
        </button>
      </form>
    </AuthPageLayout>
  );
}
