import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchMyPermissions } from '../api/permissions.js';
import { normalizeWebRole } from '../constants/userRoles.js';
import { useAuth } from './AuthContext.jsx';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  // Avoid a flash where authenticated + role=null + loading=false redirects cashiers away from /pos.
  const [loading, setLoading] = useState(() => Boolean(token));

  const load = useCallback(async () => {
    if (!token) {
      setRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyPermissions();
      setRole(data?.role ?? null);
      setPermissions((data?.permissions ?? []).map((p) => p.code));
    } catch {
      setRole(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) load();
    else {
      setRole(null);
      setPermissions([]);
      setLoading(false);
    }
  }, [isAuthenticated, load]);

  const has = useCallback(
    (code) => permissions.includes(code),
    [permissions],
  );

  const hasAny = useCallback(
    (codes = []) => codes.some((c) => permissions.includes(c)),
    [permissions],
  );

  const canSeeNavItem = useCallback(
    (item) => {
      if (item.publicNav) return true;
      const webRole = normalizeWebRole(role);
      // Optional OR: allow role even without the usual permission codes.
      if (item.alsoRoles?.length && item.alsoRoles.includes(webRole)) return true;
      if (item.roles?.length) {
        return item.roles.includes(webRole);
      }
      if (!item.permissions?.length) return true;
      if (item.anyPermission) return hasAny(item.permissions);
      return item.permissions.every((p) => has(p));
    },
    [has, hasAny, role],
  );

  const value = useMemo(
    () => ({
      role,
      permissions,
      loading,
      has,
      hasAny,
      canSeeNavItem,
      refreshPermissions: load,
    }),
    [role, permissions, loading, has, hasAny, canSeeNavItem, load],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used inside <PermissionsProvider>');
  }
  return ctx;
}
