import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isShiftOpen } from '../api/shiftSessions.js';
import { useShiftSession } from '../contexts/ShiftSessionContext.jsx';

/** Cashier POS routes require an OPEN shift session (closing is entered manually). */
export default function RequireOpenShift() {
  const { session, loading, staffRole } = useShiftSession();
  const location = useLocation();

  if (!staffRole) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[var(--admin-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0058be]/20 border-t-[#0058be]" />
      </div>
    );
  }

  const onShiftArea = location.pathname.startsWith('/pos/shift');

  if (onShiftArea) {
    return <Outlet />;
  }

  if (!isShiftOpen(session)) {
    return <Navigate to="/pos/shift/opening" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
