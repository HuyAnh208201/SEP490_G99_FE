import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PosCartProvider } from '../../contexts/PosCartContext.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';

const NAV = [
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
  {
    to: '/pos/settings',
    label: 'Account Settings',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
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
          Order
        </p>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => {
              const active =
                isActive || (item.to === '/pos' && location.pathname.startsWith('/pos/payment/'));
              return [
                // py-3 trên mobile cho dễ bấm bằng ngón tay
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

export default function PosLayout() {
  const location = useLocation();
  const { signOut } = useAuth();
  const isPayment = location.pathname.startsWith('/pos/payment/');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Đổi trang thì đóng ngăn kéo, tránh nó che nội dung vừa mở.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <PosCartProvider>
      <div
        className="flex h-screen overflow-hidden bg-[var(--admin-bg)] text-[var(--admin-text)]"
        style={{ '--pos-sidebar-width': '240px' }}
      >
        {/* Desktop: cột cố định */}
        <aside className="hidden h-full w-[var(--pos-sidebar-width)] shrink-0 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-surface)] lg:flex">
          <PosSidebarContent onSignOutClick={() => setConfirmSignOut(true)} />
        </aside>

        {/* Mobile: ngăn kéo trượt ra, không chiếm chỗ khi đóng */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Đóng menu"
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

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-2 border-b border-[var(--admin-border)] bg-white px-3 lg:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Mở menu"
                className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--admin-muted)] transition hover:bg-[#f0f4f8] lg:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                </svg>
              </button>
              <span className="truncate text-sm font-medium text-[var(--admin-muted)]">
                {isPayment ? 'Payment' : 'Point of Sale'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--admin-muted)] lg:gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--admin-success)]">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                ONLINE
              </span>
              {/* Ngày giờ chiếm nhiều chỗ trên máy nhỏ → chỉ hiện từ sm trở lên */}
              <span className="hidden sm:inline">
                {new Intl.DateTimeFormat('en-GB', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date())}
              </span>
            </div>
          </div>
          <Outlet />
        </div>
      </div>

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
