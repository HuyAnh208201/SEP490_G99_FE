import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchCurrentShiftSession } from '../api/shiftSessions.js';
import { usePermissions } from './PermissionsContext.jsx';
import { normalizeWebRole } from '../constants/userRoles.js';

const ShiftSessionContext = createContext(null);

export function ShiftSessionProvider({ children }) {
  const { role, loading: permLoading } = usePermissions();
  const webRole = normalizeWebRole(role);
  const staffRole = webRole === 'CASHIER';

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(staffRole);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!staffRole) {
      setSession(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchCurrentShiftSession();
      setSession(data);
      return data;
    } catch (err) {
      setError(err?.message || 'Failed to load shift session');
      setSession(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [staffRole]);

  useEffect(() => {
    if (permLoading) return;
    refresh();
  }, [permLoading, refresh]);

  const value = useMemo(
    () => ({
      session,
      loading: loading || permLoading,
      error,
      refresh,
      setSession,
      staffRole,
      webRole,
    }),
    [session, loading, permLoading, error, refresh, staffRole, webRole],
  );

  return (
    <ShiftSessionContext.Provider value={value}>{children}</ShiftSessionContext.Provider>
  );
}

export function useShiftSession() {
  const ctx = useContext(ShiftSessionContext);
  if (!ctx) {
    throw new Error('useShiftSession must be used within ShiftSessionProvider');
  }
  return ctx;
}
