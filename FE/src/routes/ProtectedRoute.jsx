import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermissions } from '../contexts/PermissionsContext.jsx';
import { normalizeWebRole } from '../constants/userRoles.js';
import { postLoginPath } from '../lib/postLoginPath.js';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function PermissionRoute({ permission, anyOf, roles, children }) {
  const { user } = useAuth();
  const { loading, has, hasAny, role } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0058be]/20 border-t-[#0058be]" />
      </div>
    );
  }

  const webRole = normalizeWebRole(role);
  const roleOk = Boolean(roles?.length && roles.includes(webRole));
  const permOk = anyOf?.length ? hasAny(anyOf) : permission ? has(permission) : false;
  const allowed = roleOk || permOk;

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--admin-border)] bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--admin-text)]">Access denied</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Your account is not allowed to view this page.
        </p>
        <a
          href={postLoginPath(user)}
          onClick={(e) => {
            e.preventDefault();
            window.location.assign(postLoginPath(user));
          }}
          className="mt-4 inline-block text-sm font-semibold text-[var(--admin-brand)] hover:underline"
        >
          Back to home
        </a>
      </div>
    );
  }

  return children;
}
