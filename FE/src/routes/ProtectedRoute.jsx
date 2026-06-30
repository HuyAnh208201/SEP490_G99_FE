import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { usePermissions } from '../contexts/PermissionsContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function PermissionRoute({ permission, anyOf, children }) {
  const { loading, has, hasAny } = usePermissions();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0058be]/20 border-t-[#0058be]" />
      </div>
    );
  }

  const allowed = anyOf?.length ? hasAny(anyOf) : has(permission);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--admin-border)] bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-[var(--admin-text)]">Không có quyền truy cập</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Tài khoản của bạn không được phép xem trang này.
        </p>
        <a
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign('/dashboard');
          }}
          className="mt-4 inline-block text-sm font-semibold text-[var(--admin-brand)] hover:underline"
        >
          Về Dashboard
        </a>
      </div>
    );
  }

  return children;
}
