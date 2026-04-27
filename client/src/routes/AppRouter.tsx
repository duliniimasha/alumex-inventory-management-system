import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';
import CustomersPage from '../pages/customers/CustomersPage';
import ForbiddenPage from '../pages/errors/ForbiddenPage';
import NotFoundPage from '../pages/errors/NotFoundPage';
import InventoryPage from '../pages/inventory/InventoryPage';
import OrdersPage from '../pages/orders/OrdersPage';
import ProductionPage from '../pages/production/ProductionPage';
import RawMaterialsPage from '../pages/rawMaterials/RawMaterialsPage';
import ReportsPage from '../pages/reports/ReportsPage';
import SuppliersPage from '../pages/suppliers/SuppliersPage';
import UsersPage from '../pages/users/UsersPage';
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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/raw-materials" element={<RawMaterialsPage />} />
            <Route
              path="/production"
              element={(
                <RoleGuard
                  allowedRoles={[
                    'system_admin',
                    'production_supervisor',
                    'qc_inspector',
                    'management_viewer',
                  ]}
                >
                  <ProductionPage />
                </RoleGuard>
              )}
            />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/users"
              element={(
                <RoleGuard allowedRoles={['system_admin']}>
                  <UsersPage />
                </RoleGuard>
              )}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}