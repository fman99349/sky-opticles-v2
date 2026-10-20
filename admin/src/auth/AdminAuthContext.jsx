import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { adminApi } from '../api/adminClient';

// Admin authentication state for the desktop app.
//
// The token is stored in localStorage so it survives an Electron restart.
// On mount we restore the token and re-validate it with /admin/auth/me;
// if the server rejects it, we clear it silently and show the login screen.
//
// The renderer never sees a database credential. It only ever holds the
// short-lived JWT issued by the backend.

const TOKEN_KEY = 'sky_opticles_admin_token';
const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [restoring, setRestoring] = useState(true);

  // On mount: read any stored token and ask the backend who it belongs to.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = window.localStorage.getItem(TOKEN_KEY);
        if (!stored) return;

        const result = await adminApi.me(stored);
        if (!cancelled) {
          setAdmin(result.data.admin);
          setToken(stored);
        }
      } catch {
        // Token invalid, expired, or the admin was deleted — clear it.
        window.localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const result = await adminApi.login({ email, password });
    const { admin: nextAdmin, token: nextToken } = result.data;
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setAdmin(nextAdmin);
    setToken(nextToken);
    return nextAdmin;
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setAdmin(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ admin, token, restoring, signIn, signOut }),
    [admin, token, restoring, signIn, signOut]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}