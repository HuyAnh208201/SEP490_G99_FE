import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermissions } from '../contexts/PermissionsContext.jsx';
import { normalizeWebRole } from '../constants/userRoles.js';
import { postLoginPath } from '../lib/postLoginPath.js';

/** POS shell — cashiers only. */
export default function PosRoute({ children }) {
  const { user } = useAuth();
  const { loading, role } = usePermissions();
  const webRole = normalizeWebRole(role) || normalizeWebRole(user?.role);

  // Wait until we know the role (permissions API or /auth/me profile).
  if (loading || !webRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0058be]/20 border-t-[#0058be]" />
      </div>
    );
  }

  if (webRole !== 'CASHIER') {
    return <Navigate to={postLoginPath(user)} replace />;
  }

  return children;
}
