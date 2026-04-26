import { useState, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { logoutUser } from '../api/auth.api';
import DashboardLayout from '../layouts/DashboardLayout';
import ForbiddenPage from '../pages/errors/ForbiddenPage';
import { useAuthStore } from '../store/auth.store';
import LoginPage from '../pages/auth/LoginPage';

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
}

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}

function PlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logoutUser();
    } catch {
      // Continue local logout even when server logout fails.
    } finally {
      clearAuth();
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-2 py-4 sm:px-4 sm:py-6">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">Alumex IMS</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-500 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
        <p className="mt-3 text-slate-700">
          Placeholder page for <span className="font-semibold">{title}</span>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Signed in as {user?.name ?? 'Unknown user'} ({user?.role ?? 'no role'})
        </p>
      </section>
    </main>
  );
}

function DashboardPage() {
  return <PlaceholderPage title="Dashboard" />;
}

function InventoryPage() {
  return <PlaceholderPage title="Inventory" />;
}

function ProductionPage() {
  return <PlaceholderPage title="Production" />;
}

function OrdersPage() {
  return <PlaceholderPage title="Orders" />;
}

function ReportsPage() {
  return <PlaceholderPage title="Reports" />;
}

function UsersPage() {
  return <PlaceholderPage title="Users" />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/users"
              element={(
                <RoleGuard allowedRoles={['system_admin']}>
                  <UsersPage />
                </RoleGuard>
              )}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}