import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';
import { normalizeWebRole } from '../../constants/userRoles.js';
import Button from '../ui/Button.jsx';

const CONSOLE_TITLES = {
  ADMIN: 'Admin console',
  DIRECTOR: 'Director console',
  BRANCH_MANAGER: 'Branch console',
  WAREHOUSE_MANAGER: 'Warehouse console',
  INVENTORY_STAFF: 'Inventory console',
};

export default function TopBar({ onMenuToggle, showMenuButton }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = usePermissions();
  const webRole = normalizeWebRole(role || user?.role);
  const consoleTitle = CONSOLE_TITLES[webRole] || 'ChainStore';

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const roleLabel = ROLE_LABELS[webRole] || ROLE_LABELS[user?.role] || user?.role || '—';
  const displayName = user?.fullName || user?.name || 'there';
  const initials = (displayName === 'there' ? 'U' : displayName)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-[var(--header-height)] items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 lg:px-6">
      <div className="flex items-center gap-3">
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
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--admin-subtle)]">
            {consoleTitle}
          </p>
          <p className="text-sm font-semibold text-[var(--admin-text)]">
            Hello, {displayName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-[#0058be]/10 px-3 py-1 text-xs font-semibold text-[var(--admin-brand)] sm:inline">
          {roleLabel}
        </span>

        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-2 py-1.5 pr-3 transition hover:border-[#0058be]/30"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-brand)] text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-sm font-medium text-[var(--admin-text)] sm:block">
            Account
          </span>
        </Link>

        <Button variant="ghost" className="!px-3 !py-2" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
