import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';
import Button from '../ui/Button.jsx';

function initials(name) {
  return String(name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export default function PosTopBar({
  onMenuToggle,
  showMenuButton,
  showEndShift,
  onEndShift,
  online,
  now,
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const displayName = user?.fullName || user?.name || user?.email || 'there';
  const roleLabel = ROLE_LABELS.CASHIER || 'Cashier';

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg border border-[var(--admin-border)] p-2 text-[var(--admin-muted)] hover:bg-[#f0f4f8] lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--admin-subtle)]">
            POS terminal
          </p>
          <p className="truncate text-sm font-semibold text-[var(--admin-text)]">Hello, {displayName}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {showEndShift && (
          <button
            type="button"
            onClick={onEndShift}
            className="hidden rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[#f0f4f8] sm:inline"
          >
            End shift
          </button>
        )}

        <span
          className={`hidden items-center gap-1.5 text-xs font-semibold md:flex ${
            online ? 'text-[var(--admin-success)]' : 'text-[var(--admin-subtle)]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              online ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-subtle)]'
            }`}
          />
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>

        {now && (
          <span className="hidden tabular-nums text-xs text-[var(--admin-muted)] xl:inline">
            {new Intl.DateTimeFormat('en-GB', {
              dateStyle: 'short',
              timeStyle: 'medium',
              hour12: false,
            }).format(now)}
          </span>
        )}

        <span className="hidden rounded-full bg-[#0058be]/10 px-3 py-1 text-xs font-semibold text-[var(--admin-brand)] sm:inline">
          {roleLabel}
        </span>

        <Link
          to="/pos/settings"
          className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-2 py-1.5 pr-3 transition hover:border-[#0058be]/30"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-brand)] text-xs font-bold text-white">
            {initials(displayName)}
          </span>
          <span className="hidden text-sm font-medium text-[var(--admin-text)] sm:block">Account</span>
        </Link>

        <Button variant="ghost" className="!px-3 !py-2" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
