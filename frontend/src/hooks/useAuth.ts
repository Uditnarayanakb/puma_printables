import { useCallback, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "../types/order";

const STORAGE_KEY = "puma.printables.auth";

type AuthUser = {
  username: string;
  role: JwtPayload["role"];
  displayName?: string;
  avatarUrl?: string;
  provider?: "LOCAL" | "GOOGLE";
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  expiresAt: number | null;
};

type DecodedToken = {
  user: AuthUser;
  expiresAt: number | null;
};

function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (!payload.sub || !payload.role) {
      return null;
    }
    const now = Date.now();
    const expiresAt =
      typeof payload.exp === "number" ? payload.exp * 1000 : null;
    if (expiresAt !== null && expiresAt <= now) {
      return null;
    }
    const user: AuthUser = {
      username: payload.sub,
      role: payload.role,
    };
    if (payload.name) {
      user.displayName = payload.name;
    }
    if (payload.avatar) {
      user.avatarUrl = payload.avatar;
    }
    if (payload.provider === "LOCAL" || payload.provider === "GOOGLE") {
      user.provider = payload.provider;
    }
    return {
      user,
      expiresAt,
    };
  } catch (err) {
    console.warn("Unable to decode JWT payload", err);
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { token: null, user: null, expiresAt: null };
    }
    try {
      const parsed = JSON.parse(stored) as Partial<AuthState>;
      if (parsed.token) {
        const decoded = decodeToken(parsed.token);
        if (decoded) {
          return {
            token: parsed.token,
            user: decoded.user,
            expiresAt: decoded.expiresAt,
          };
        }
      }
    } catch (err) {
      console.warn("Unable to parse stored auth state", err);
    }
    localStorage.removeItem(STORAGE_KEY);
    return { token: null, user: null, expiresAt: null };
  });

  const isAuthenticated = Boolean(state.token && state.user);

  useEffect(() => {
    if (state.token && state.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const login = useCallback((token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) {
      throw new Error("Invalid authentication token");
    }
    setState({ token, user: decoded.user, expiresAt: decoded.expiresAt });
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, user: null, expiresAt: null });
  }, []);

  const guard = useCallback(() => {
    if (!state.token || !state.user) {
      throw new Error("Not authenticated");
    }
    if (state.expiresAt !== null && state.expiresAt <= Date.now()) {
      throw new Error("Session expired");
    }
    return { token: state.token, user: state.user };
  }, [state.token, state.user, state.expiresAt]);

  useEffect(() => {
    if (!state.token || !state.user || state.expiresAt === null) {
      return undefined;
    }
    const remaining = state.expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      logout();
    }, remaining);
    return () => window.clearTimeout(timeoutId);
  }, [state.token, state.user, state.expiresAt, logout]);

  return useMemo(
    () => ({
      token: state.token,
      user: state.user,
      isAuthenticated,
      login,
      logout,
      requireAuth: guard,
    }),
    [state.token, state.user, isAuthenticated, login, logout, guard]
  );
}
