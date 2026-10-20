import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { registerUser, loginUser, fetchMe, updateMyProfile } from '../utils/api';
import { saveToken, loadToken, clearToken } from '../utils/authStorage';

const AuthContext = createContext(null);

// Customer authentication state for the whole app.
// On mount, restores the token from storage and revalidates it with /auth/me.
// Nothing else in the app changes until AuthProvider is wrapped around App.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadToken();
        if (!stored) return;

        const result = await fetchMe(stored);
        if (!cancelled) {
          setUser(result.data.user);
          setToken(stored);
        }
      } catch {
        await clearToken();
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const result = await loginUser({ email, password });
    await saveToken(result.data.token);
    setUser(result.data.user);
    setToken(result.data.token);
    return result.data.user;
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    const result = await registerUser({ name, email, password });
    await saveToken(result.data.token);
    setUser(result.data.user);
    setToken(result.data.token);
    return result.data.user;
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setUser(null);
    setToken(null);
  }, []);

  // Update the signed-in customer's name, phone, or email.
  // The backend returns the updated user object; we store it in state so
  // every consumer of useAuth() sees the fresh values immediately. The token
  // remains valid — it identifies the user by id, not by email.
  const updateProfile = useCallback(
    async (patch) => {
      if (!token) throw new Error('Please sign in to update your profile.');
      const result = await updateMyProfile(token, patch);
      setUser(result.data.user);
      return result.data.user;
    },
    [token]
  );



   const value = useMemo(
    () => ({
      user,
      token,
      restoring,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [user, token, restoring, signIn, signUp, signOut, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}