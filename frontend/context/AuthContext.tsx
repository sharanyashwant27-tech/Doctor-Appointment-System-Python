import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '@services/auth';
import { clearTokens, getAccessToken, setTokens } from '@services/client';
import type { AuthUser, UserRole } from '@/types/auth';

export type { AuthUser, UserRole };

type AuthContextValue = {
  user: AuthUser;
  accessToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, otp?: string) => Promise<AuthUser>;
  loginWithTokens: (access: string, refresh: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthUser>;
  setSession: (user: AuthUser, access: string | null, refresh?: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((nextUser: AuthUser, access: string | null, refresh?: string | null) => {
    setUser(nextUser);
    setAccessToken(access);
    setTokens(access, refresh);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }, []);

  const login = useCallback(async (email: string, password: string, otp?: string) => {
    const tokens = await authApi.login({ email, password, otp });
    setAccessToken(tokens.access_token);
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }, []);

  const loginWithTokens = useCallback(async (access: string, refresh: string) => {
    setTokens(access, refresh);
    setAccessToken(access);
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logoutApi();
    } finally {
      setUser(null);
      setAccessToken(null);
      clearTokens();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAccessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await authApi.fetchMe();
        if (!cancelled) {
          setUser(me);
          setAccessToken(token);
        }
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(accessToken),
      login,
      loginWithTokens,
      logout,
      refreshMe,
      setSession,
    }),
    [user, accessToken, loading, login, loginWithTokens, logout, refreshMe, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
