import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { ROLE_LABELS } from '../../config/navigation.js';
import NavIcon from './NavIcon.jsx';

const POS_NAV_GROUPS = [
  {
    label: 'Shift',
    items: [
      {
        path: '/pos/shift',
        label: 'Shift',
        icon: 'clock',
        end: true,
        alsoMatch: ['/pos/shift/opening', '/pos/shift/current', '/pos/shift/closing'],
      },
      {
        path: '/pos/shift/history',
        label: 'Shift history',
        icon: 'report',
        end: true,
      },
      {
        path: '/pos/my-shifts',
        label: 'My schedule',
        icon: 'plan',
        end: true,
        matchPrefix: '/pos/my-shifts',
      },
    ],
  },
  {
    label: 'Order',
    items: [
      {
        path: '/pos',
        label: 'Product Cart',
        icon: 'store',
        end: true,
        alsoMatch: ['/pos/payment'],
      },
      {
        path: '/pos/history',
        label: 'Order History',
        icon: 'report',
      },
      {
        path: '/pos/inventory',
        label: 'Inventory Products',
        icon: 'package',
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        path: '/pos/settings',
        label: 'Account settings',
        icon: 'user',
      },
    ],
  },
];

function initials(name) {
  return String(name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function isPosItemActive(pathname, item) {
  if (item.alsoMatch?.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  }
  if (item.end) {
    return pathname === item.path;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export default function PosSidebar({ onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();
  const displayName = user?.fullName || user?.name || user?.email || 'Cashier';
  const roleLabel = ROLE_LABELS.CASHIER || 'Cashier';

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--admin-border)] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-brand)] text-white">
          <NavIcon name="store" className="h-4 w-4 stroke-current" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--admin-text)]">ChainStore</p>
          <p className="truncate text-[11px] text-[var(--admin-muted)]">Point of sale</p>
        </div>
      </div>

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

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {POS_NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isPosItemActive(location.pathname, item);
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      onClick={onNavigate}
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
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
