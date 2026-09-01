"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, LoginResponse } from "@/lib/types";
import { apiGet, apiPost, clearAuth, getStoredUser, getToken, setStoredUser, setTokens } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function initUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  if (!getToken()) return null;
  return getStoredUser<AuthUser>();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(initUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      if (!getToken()) {
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const currentUser = await apiGet<AuthUser>("/auth/me");
        if (cancelled) return;
        setStoredUser(currentUser);
        setUser(currentUser);
      } catch {
        clearAuth();
        if (!cancelled) {
          setUser(null);
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiPost<LoginResponse>("/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });
      setTokens(res.accessToken, res.refreshToken);
      setStoredUser(res.user);
      setUser(res.user);
      router.replace("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    clearAuth();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const hasPermission = useCallback((code: string) => user?.permissions?.includes(code) ?? false, [user]);

  const value = useMemo(
    () => ({ user, ready, login, logout, updateUser, hasPermission }),
    [user, ready, login, logout, updateUser, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
