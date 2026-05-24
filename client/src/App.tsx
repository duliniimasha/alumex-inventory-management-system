import { useEffect } from 'react';
import AppRouter from './routes/AppRouter';
import GlobalLoadingBar from './components/ui/GlobalLoadingBar';
import { useAuthStore } from './store/auth.store';

export default function App() {
  useEffect(() => {
    useAuthStore.getState().initializeAuth();
  }, []);

  return (
    <>
      <GlobalLoadingBar />
      <AppRouter />
    </>
  );
}