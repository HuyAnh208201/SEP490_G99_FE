import { Navigate } from 'react-router-dom';
import { isShiftClosing, isShiftOpen } from '../../api/shiftSessions.js';
import { useShiftSession } from '../../contexts/ShiftSessionContext.jsx';

/** Cashier shift entry: routes to opening or current shift (never closing). */
export default function ShiftHomePage() {
  const { session, loading } = useShiftSession();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0058be]/20 border-t-[#0058be]" />
      </div>
    );
  }

  if (isShiftOpen(session) || isShiftClosing(session)) {
    return <Navigate to="/pos/shift/current" replace />;
  }

  return <Navigate to="/pos/shift/opening" replace />;
}
