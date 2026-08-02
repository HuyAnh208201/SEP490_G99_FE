import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { isShiftOpen } from '../../api/shiftSessions.js';
import { PosCartProvider } from '../../contexts/PosCartContext.jsx';
import { usePosClock } from '../../hooks/usePosClock.js';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import PosHelpDialog from './components/PosHelpDialog.jsx';

const SHIFT_NAV = [
  {
    to: '/pos/shift',
    end: true,
    label: 'Shift',
    icon: (
      <>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 8v4l2.5 2M8 4h8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

const ORDER_NAV = [
  {
    to: '/pos',
    end: true,
    label: 'Product Cart',
    icon: (
      <path
        d="M3 9.5 5 4h14l2 5.5M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5ZM9 14h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    to: '/pos/history',
    label: 'Order History',
    icon: (
      <>
        <path
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
  {
    to: '/pos/inventory',
    label: 'Inventory Products',
    icon: (
      <path
        d="M4 7h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Zm0 0 2-3h12l2 3M9 12h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
];

/** Ruột sidebar — dùng chung cho cột cố định (desktop) và ngăn kéo (mobile). */
function PosSidebarContent({ onNavigate, onSignOutClick }) {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <div className="flex h-[var(--header-height)] shrink-0 items-center gap-3 border-b border-[var(--admin-border)] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-brand)] text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <path
              d="M3 9.5 5 4h14l2 5.5M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--admin-text)]">ChainStore</p>
          <p className="truncate text-[11px] text-[var(--admin-muted)]">Cashier POS</p>
        </div>
      </div>

      <div className="border-b border-[var(--admin-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0058be]/10 text-xs font-bold text-[var(--admin-brand)]">
            {(user?.name ?? 'Cashier')
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--admin-text)]">
              {user?.name ?? 'Cashier'}
            </p>
            <p className="truncate text-xs text-[var(--admin-muted)]">Cashier</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
          Shift
        </p>
        {SHIFT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => {
              const active = isActive || location.pathname.startsWith('/pos/shift/');
              return [
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition lg:py-2.5',
                active
                  ? 'bg-[#0058be]/10 text-[var(--admin-brand)]'
                  : 'text-[var(--admin-muted)] hover:bg-[#f0f4f8] hover:text-[var(--admin-text)]',
              ].join(' ');
            }}
          >
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-[#f7f9fb] transition',
                location.pathname.startsWith('/pos/shift')
                  ? 'border-[#0058be]/20 bg-white text-[var(--admin-brand)]'
                  : 'border-transparent text-[var(--admin-subtle)]',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                {item.icon}
              </svg>
            </span>
            {item.label}
          </NavLink>
        ))}

        <p className="mb-2 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-subtle)]">
          Order
        </p>
        {ORDER_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => {
              const active =
                isActive || (item.to === '/pos' && location.pathname.startsWith('/pos/payment/'));
              return [
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition lg:py-2.5',
                active
                  ? 'bg-[#0058be]/10 text-[var(--admin-brand)]'
                  : 'text-[var(--admin-muted)] hover:bg-[#f0f4f8] hover:text-[var(--admin-text)]',
              ].join(' ');
            }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f7f9fb]">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                {item.icon}
              </svg>
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--admin-border)] p-3">
        <button
          type="button"
          onClick={onSignOutClick}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[var(--admin-muted)] transition hover:bg-[#f0f4f8] hover:text-[var(--admin-text)] lg:py-2.5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </>
  );
}

function shiftLabel(shiftNumber) {
  if (shiftNumber === 1) return 'Morning';
  if (shiftNumber === 2) return 'Afternoon';
  if (shiftNumber === 3) return 'Evening';
  return shiftNumber ? `Shift #${shiftNumber}` : 'Shift';
}

function formatShiftTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function PosLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { session } = useShiftSession();
  const isPayment = location.pathname.startsWith('/pos/payment/');
  const onWorkPage =
    !location.pathname.startsWith('/pos/shift/') &&
    !location.pathname.startsWith('/pos/payment/');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { now, online } = usePosClock();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'F1') return;
      event.preventDefault();
      setHelpOpen(true);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const headerTitle = location.pathname.startsWith('/pos/shift/')
    ? 'Shift'
    : isPayment
      ? 'Payment'
      : location.pathname.startsWith('/pos/settings')
        ? 'Account Settings'
        : 'Point of Sale';
  const shift = session?.shift;
  const currentShiftLabel = shiftLabel(shift?.shiftNumber);
  const shiftTime = `${formatShiftTime(shift?.startTime)} – ${formatShiftTime(shift?.endTime)}`;

  return (
    <PosCartProvider>
      <div
        className="flex h-screen overflow-hidden bg-[var(--admin-bg)] text-[var(--admin-text)]"
        style={{ '--pos-sidebar-width': '240px' }}
      >
        {drawerOpen && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[82vw] max-w-[300px] flex-col bg-[var(--admin-surface)] shadow-2xl">
              <PosSidebarContent
                onNavigate={() => setDrawerOpen(false)}
                onSignOutClick={() => {
                  setDrawerOpen(false);
                  setConfirmSignOut(true);
                }}
              />
            </aside>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--admin-border)] bg-white px-3 lg:gap-3 lg:px-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open POS menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--admin-border)] text-[var(--admin-muted)] transition hover:bg-[#f0f4f8]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
            <p className="min-w-0 truncate text-sm font-bold text-[var(--admin-text)]">
              {session?.branchName || 'ChainStore'}
              <span className="font-medium text-[var(--admin-subtle)]"> · {headerTitle}</span>
            </p>

            <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
              {isShiftOpen(session) && onWorkPage && (
                <button
                  type="button"
                  onClick={() => navigate('/pos/shift/closing')}
                  className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] transition hover:bg-[#f0f4f8]"
                >
                  End shift
                </button>
              )}
              <span
                className={`hidden items-center gap-1.5 text-xs font-semibold sm:flex ${
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
              <span className="hidden tabular-nums text-xs text-[var(--admin-muted)] lg:inline">
                {new Intl.DateTimeFormat('en-GB', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                  hour12: false,
                }).format(now)}
              </span>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title="Quick guide (F1)"
                aria-label="Open POS help"
                className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[var(--admin-border)] text-sm font-bold text-[var(--admin-muted)] transition hover:bg-[#f0f4f8] hover:text-[var(--admin-brand)] sm:flex"
              >
                ?
              </button>
              <button
                type="button"
                onClick={() => navigate('/pos/settings')}
                title="Account Settings"
                className="flex items-center gap-2 rounded-lg border border-transparent py-1 pl-2 pr-1 transition hover:border-[var(--admin-border)] hover:bg-[#f0f4f8] lg:pl-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0058be]/10 text-[11px] font-bold text-[var(--admin-brand)]">
                  {(session?.employeeName || 'Cashier')
                    .split(' ')
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="hidden min-w-0 text-left leading-tight sm:block">
                  <p className="truncate text-xs font-semibold text-[var(--admin-text)]">
                    {session?.employeeName || 'Cashier'}
                  </p>
                  <p className="truncate text-[11px] text-[var(--admin-muted)]">
                    {isShiftOpen(session) ? `${currentShiftLabel} · ${shiftTime}` : 'No open shift'}
                  </p>
                </div>
              </button>
            </div>
          </div>
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <PosHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out"
        message="Are you sure you want to sign out of the POS terminal?"
        confirmLabel="Sign out"
        danger
        onConfirm={() => signOut()}
      />
    </PosCartProvider>
  );
}
