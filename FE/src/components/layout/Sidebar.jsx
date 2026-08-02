import { NavLink, useLocation } from 'react-router-dom';
import { NAV_GROUPS, ROLE_LABELS } from '../../config/navigation.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { isNavItemActive } from '../../lib/navActive.js';
import { normalizeWebRole } from '../../constants/userRoles.js';
import NavIcon from './NavIcon.jsx';

function initials(name) {
  return String(name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function navItemLabel(item, role) {
  if (item.path !== '/reports') return item.label;
  if (role === 'BRANCH_MANAGER') return 'Branch';
  if (role === 'DIRECTOR') return 'Revenue Dashboard';
  return 'Revenue & reports';
}

export default function Sidebar({ collapsed = false, onNavigate }) {
  const { canSeeNavItem } = usePermissions();
  const { user } = useAuth();
  const location = useLocation();
  const role = normalizeWebRole(user?.role);
  const roleLabel = ROLE_LABELS[role] || role || 'User';
  const displayName = user?.fullName || user?.name || user?.email || 'User';

  const allNavPaths = NAV_GROUPS.flatMap((group) =>
    group.items.filter(canSeeNavItem).map((item) => item.path),
  );

  return (
    <aside
      className={`flex h-full flex-col border-r border-[var(--admin-border)] bg-[var(--admin-surface)] transition-all ${
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
      }`}
    >
      <div className="flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--admin-border)] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-brand)] text-white">
          <NavIcon name="store" className="h-4 w-4 stroke-current" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--admin-text)]">ChainStore</p>
            <p className="truncate text-[11px] text-[var(--admin-muted)]">Chain store management</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="border-b border-[var(--admin-border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0058be]/10 text-xs font-bold text-[var(--admin-brand)]">
              {initials(displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{displayName}</p>
              <p className="truncate text-[11px] text-[var(--admin-muted)]">{roleLabel}</p>
              {user?.branchName ? (
                <p className="truncate text-[11px] text-[var(--admin-subtle)]">{user.branchName}</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(canSeeNavItem);
          if (!visibleItems.length) return null;

          return (
            <div key={group.label} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isNavItemActive(location.pathname, item.path, allNavPaths);
                  const label = navItemLabel(item, role);
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/dashboard'}
                        onClick={onNavigate}
                        title={collapsed ? label : undefined}
                        className={() =>
                          [
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                            active
                              ? 'bg-[#0058be]/10 text-[var(--admin-brand)]'
                              : 'text-[var(--admin-muted)] hover:bg-[#f0f4f8] hover:text-[var(--admin-text)]',
                          ].join(' ')
                        }
                      >
                        <span
                          className={[
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-[#f7f9fb] transition',
                            active
                              ? 'border-[#0058be]/20 bg-white text-[var(--admin-brand)]'
                              : 'border-transparent text-[var(--admin-subtle)]',
                          ].join(' ')}
                        >
                          <NavIcon name={item.icon} className="h-[18px] w-[18px] stroke-current" />
                        </span>
                        {!collapsed && (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate">{label}</span>
                            {item.comingSoon && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                                Soon
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
