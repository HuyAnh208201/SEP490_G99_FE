import { Link } from 'react-router-dom';

export default function AuthPageLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f9fb] text-[#191c1e]">
      <header className="fixed top-0 z-50 w-full bg-white shadow-[0_2px_12px_0_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/login" className="text-xl font-bold tracking-tight text-[#191c1e]">
            ChainStore
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0058be] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center px-6 py-20 pt-[120px]">
        <div className="w-full max-w-[480px] rounded-xl border border-[#e0e3e5]/30 bg-white p-12 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_2px_4px_-1px_rgba(0,0,0,0.02)]">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0058be]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-white">
                <rect
                  x="4"
                  y="11"
                  width="16"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 11V7a4 4 0 0 1 8 0v4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 className="mb-1 text-center text-[28px] font-semibold leading-10 tracking-tight text-[#191c1e]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-center text-base text-[#45464d]">{subtitle}</p>
            )}
          </div>

          {children}

          {footer && <div className="mt-8 text-center">{footer}</div>}
        </div>
      </main>

      <footer className="mt-auto border-t border-[#e0e3e5] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-2">
          <div className="text-sm text-[#45464d] opacity-80">
            © 2026 ChainStore. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
