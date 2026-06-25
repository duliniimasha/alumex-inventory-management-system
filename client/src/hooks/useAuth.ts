import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setLoading = useAuthStore((state) => state.setLoading);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  return {
    user,
    isAuthenticated,
    isLoading,
    setAuth,
    clearAuth,
    setLoading,
    initializeAuth,
  };
}