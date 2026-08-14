import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';

const TOKEN_KEY = 'chainstore_token';
const USER_KEY = 'chainstore_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const signIn = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const { token: t, user: u } = await authApi.login(credentials);
      if (t) localStorage.setItem(TOKEN_KEY, t);
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
      setToken(t);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateCurrentUser = useCallback((nextUser) => {
    setUser((current) => ({
      ...(current || {}),
      ...(nextUser || {}),
    }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
      updateCurrentUser,
    }),
    [user, token, loading, signIn, signOut, updateCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
