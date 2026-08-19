"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, LoginResponse } from "@/lib/types";
import { apiPost, clearAuth, getStoredUser, getToken, setStoredUser, setTokens } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const [ready] = useState(true);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiPost<LoginResponse>("/auth/login", { email, password });
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

  const hasPermission = useCallback((code: string) => user?.permissions?.includes(code) ?? false, [user]);

  const value = useMemo(() => ({ user, ready, login, logout, hasPermission }), [user, ready, login, logout, hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}