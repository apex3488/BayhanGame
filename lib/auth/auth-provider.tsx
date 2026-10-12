"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { miniappFetch, type MiniappUser } from "@/lib/api/miniapp-client";
import { env } from "@/lib/config/env";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session";

type AuthStatus = "loading" | "guest" | "authenticated" | "unconfigured";

interface AuthValue {
  status: AuthStatus;
  user: MiniappUser | null;
  login: (login: string, password: string) => Promise<void>;
  register: (login: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<MiniappUser | null>(null);

  const refresh = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setStatus(env.gameApiUrl ? "guest" : "unconfigured");
      return;
    }
    try {
      const me = await miniappFetch<MiniappUser>("/api/auth/me");
      setUser(me);
      setStatus("authenticated");
    } catch {
      clearAccessToken();
      setUser(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const login = useCallback(async (loginName: string, password: string) => {
    const res = await miniappFetch<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login: loginName, password }),
    });
    setAccessToken(res.access_token);
    await refresh();
  }, [refresh]);

  const register = useCallback(
    async (loginName: string, password: string, displayName?: string) => {
      const res = await miniappFetch<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ login: loginName, password, display_name: displayName }),
      });
      setAccessToken(res.access_token);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setStatus("guest");
  }, []);

  const value = useMemo(
    () => ({ status, user, login, register, logout, refresh }),
    [status, user, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
