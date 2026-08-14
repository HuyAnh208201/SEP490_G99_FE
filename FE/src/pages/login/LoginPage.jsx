import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { isSafeReturnPath, postLoginPath } from '../../lib/postLoginPath.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading } = useAuth();

  const [form, setForm] = useState({ username: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function updateField(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await signIn({ username: form.username, password: form.password });
      const from = location.state?.from?.pathname;
      const target = isSafeReturnPath(from, user) ? from : postLoginPath(user);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[#191c1e]">
      {/* Top app bar */}
      <header className="fixed top-0 z-50 w-full bg-white shadow-[0_2px_12px_0_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
          <div className="text-xl font-bold tracking-tight text-[#191c1e]">
            ChainStore
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#"
              className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d] transition-colors hover:text-[#0058be]"
            >
              Support
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-grow items-center justify-center px-6 py-20 pt-[120px]">
        <div className="w-full max-w-[480px] rounded-xl border border-[#e0e3e5]/30 bg-white p-12 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_2px_4px_-1px_rgba(0,0,0,0.02)]">
          {/* Logo & title */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0058be]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
                <path
                  d="M3 9.5 5 4h14l2 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 14h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="mb-1 text-[32px] font-semibold leading-10 tracking-tight text-[#191c1e]">
              Welcome back
            </h1>
            <p className="text-center text-base text-[#45464d]">
              Securely sign in to the chain store management system
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Username */}
            <div className="space-y-1">
              <label
                htmlFor="username"
                className="text-xs font-semibold uppercase tracking-wider text-[#191c1e]"
              >
                Username / Email
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
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="admin@chainstore.vn"
                  value={form.username}
                  onChange={updateField('username')}
                  required
                  className="w-full border-none bg-transparent py-3 pl-11 pr-3 text-base placeholder:text-[#c6c6cd] focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-[#191c1e]"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0058be] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="group relative flex items-center rounded-lg border border-[#c6c6cd] bg-white transition-all focus-within:border-[#0058be] focus-within:shadow-[0_0_0_3px_rgba(0,88,190,0.2)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="absolute left-3 h-5 w-5 text-[#76777d] transition-colors group-focus-within:text-[#0058be]"
                >
                  <rect
                    x="4"
                    y="11"
                    width="16"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M8 11V7a4 4 0 0 1 8 0v4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={updateField('password')}
                  required
                  className="w-full border-none bg-transparent py-3 pl-11 pr-11 text-base placeholder:text-[#c6c6cd] focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 text-[#76777d] transition-colors hover:text-[#191c1e]"
                >
                  {showPassword ? (
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
                      <path
                        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={form.remember}
                onChange={updateField('remember')}
                className="h-4 w-4 rounded-sm border-[#c6c6cd] text-[#0058be] focus:ring-[#0058be]/20"
              />
              <label htmlFor="remember" className="text-sm text-[#45464d]">
                Keep me signed in for 30 days
              </label>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 px-3 py-2 text-sm text-[#93000a]"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border-t border-white/10 bg-[#0058be] py-3 text-xs font-bold uppercase tracking-[0.05em] text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in to ChainStore'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#e0e3e5] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-row items-center justify-between px-6 py-2">
          <div className="text-sm text-[#45464d] opacity-80 transition-opacity hover:opacity-100">
            © 2026 ChainStore. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d] transition-colors hover:text-[#0058be]"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d] transition-colors hover:text-[#0058be]"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464d] transition-colors hover:text-[#0058be]"
            >
              Support
            </a>
          </div>
        </div>
      </footer>

      {/* Background atmospheric */}
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-full w-1/2 opacity-30">
        <div className="absolute right-0 top-0 h-full w-full bg-gradient-to-bl from-[#adc6ff]/20 to-transparent" />
      </div>
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-full w-1/2 opacity-20">
        <div className="absolute bottom-0 left-0 h-full w-full bg-gradient-to-tr from-[#e6e8ea]/40 to-transparent" />
      </div>
    </div>
  );
}
