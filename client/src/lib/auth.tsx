/**
 * Auth context for the operator cockpit.
 *
 * Mirrors anchor-frontend's AuthProvider but layers an isAdmin check on
 * top — only users whose backend session reports isAdmin=true are allowed
 * past the gate. permissions[] travels with the session so pages can
 * conditionally render buttons (a Support admin shouldn't see the
 * "grant credits" button at all, even though the backend would also 403).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UNAUTHENTICATED_EVENT } from "./api";

export interface AdminSessionUser {
  id: string;
  email: string;
  isAdmin: boolean;
  permissions: string[];
}

interface AuthCtx {
  user: AdminSessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  /** Convenience: returns true when the held permissions include the required one (or 'super'). */
  can: (perm: string) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) { setUser(null); return; }
      const data = await res.json();
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setUser(null);
    }
  };

  const can = (perm: string): boolean => {
    if (!user) return false;
    return user.permissions.includes("super") || user.permissions.includes(perm);
  };

  useEffect(() => {
    refresh();
    const onUnauthed = () => setUser(null);
    window.addEventListener(UNAUTHENTICATED_EVENT, onUnauthed);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onUnauthed);
  }, []);

  return <Ctx.Provider value={{ user, loading, refresh, logout, can }}>{children}</Ctx.Provider>;
}

export function useSession(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside <AuthProvider>");
  return ctx;
}
