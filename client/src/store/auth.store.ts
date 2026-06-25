import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthState, AuthUser } from '../types/auth.types';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../api/auth.api';

const USER_STORAGE_KEY = 'alumex_user';

let authListenerBound = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setAuth: (user: AuthUser) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        set({ user, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem(USER_STORAGE_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false });
      },
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      // Session validity is owned by Supabase. On startup we check for an active
      // session and (re)load the application profile; we also subscribe once to
      // auth changes so sign-out / token expiry clears local state.
      initializeAuth: async () => {
        set({ isLoading: true });

        if (!authListenerBound) {
          authListenerBound = true;
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
              get().clearAuth();
            }
          });
        }

        try {
          const { data } = await supabase.auth.getSession();

          if (!data.session) {
            get().clearAuth();
            return;
          }

          const profile = await getCurrentUser();
          get().setAuth(profile);
        } catch {
          await supabase.auth.signOut();
          get().clearAuth();
        } finally {
          set({ isLoading: false });
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
