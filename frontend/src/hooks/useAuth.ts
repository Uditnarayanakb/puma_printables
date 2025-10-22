import { useCallback, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "../types/order";

const STORAGE_KEY = "puma.printables.auth";

type AuthUser = {
  username: string;
  role: JwtPayload["role"];
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (!payload.sub || !payload.role) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return {
      username: payload.sub,
      role: payload.role,
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
      return { token: null, user: null };
    }
    const parsed = JSON.parse(stored) as AuthState;
    if (parsed.token) {
      const user = decodeToken(parsed.token);
      if (user) {
        return { token: parsed.token, user };
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    return { token: null, user: null };
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
    const user = decodeToken(token);
    if (!user) {
      throw new Error("Invalid authentication token");
    }
    setState({ token, user });
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, user: null });
  }, []);

  const guard = useCallback(() => {
    if (!state.token || !state.user) {
      throw new Error("Not authenticated");
    }
    return { token: state.token, user: state.user };
  }, [state.token, state.user]);

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
