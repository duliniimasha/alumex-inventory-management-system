import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthState, AuthUser } from '../types/auth.types';

const TOKEN_STORAGE_KEY = 'alumex_token';
const USER_STORAGE_KEY = 'alumex_user';

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadSegment = token.split('.')[1];

    if (!payloadSegment) {
      return null;
    }

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (token: string, user: AuthUser) => {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      initializeAuth: () => {
        set({ isLoading: true });

        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const rawUser = localStorage.getItem(USER_STORAGE_KEY);

        if (!token || !rawUser || isTokenExpired(token)) {
          get().clearAuth();
          return;
        }

        try {
          const user = JSON.parse(rawUser) as AuthUser;
          get().setAuth(token, user);
          set({ isLoading: false });
        } catch {
          get().clearAuth();
        }
      },
    }),
    {
      name: 'alumex_auth_user_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);