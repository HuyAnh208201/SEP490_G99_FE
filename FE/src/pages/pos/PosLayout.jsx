import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';
import { isShiftOpen } from '../../api/shiftSessions.js';
import { PosCartProvider } from '../../contexts/PosCartContext.jsx';
import { usePosClock } from '../../hooks/usePosClock.js';
import PosSidebar from '../../components/layout/PosSidebar.jsx';
import PosTopBar from '../../components/layout/PosTopBar.jsx';

export default function PosLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useShiftSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { now, online } = usePosClock();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const onWorkPage =
    !location.pathname.startsWith('/pos/shift') &&
    !location.pathname.startsWith('/pos/my-shifts') &&
    !location.pathname.startsWith('/pos/payment/');

  return (
    <PosCartProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--admin-bg)] text-[var(--admin-text)]">
        <div className="hidden lg:flex">
          <PosSidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 h-full w-[var(--sidebar-width)] shadow-xl">
              <PosSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PosTopBar
            showMenuButton
            onMenuToggle={() => setMobileOpen((open) => !open)}
            showEndShift={isShiftOpen(session) && onWorkPage}
            onEndShift={() => navigate('/pos/shift/closing')}
            online={online}
            now={now}
          />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </PosCartProvider>
  );
}
