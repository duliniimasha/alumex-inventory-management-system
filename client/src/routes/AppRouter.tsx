/*
 * ALUMEX IMS — Route Map
 *
 * PUBLIC
 * /login                → LoginPage
 *
 * PROTECTED (all roles)
 * /dashboard            → DashboardPage
 * /inventory            → InventoryPage
 * /production           → ProductionPage (excl. sales_executive)
 * /orders               → OrdersPage (excl. procurement, qc_inspector)
 * /customers            → CustomersPage (sales + export + admin + viewer)
 * /raw-materials        → RawMaterialsPage (procurement + production + admin + viewer)
 * /suppliers            → SuppliersPage (procurement + admin + viewer)
 * /reports              → ReportsPage (all roles, filtered by role)
 *
 * ADMIN ONLY
 * /users                → UsersPage (system_admin only)
 *
 * ERROR ROUTES
 * /403                  → ForbiddenPage
 * *                     → NotFoundPage
 */
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

const PUBLIC_ROUTES = ['/login'];

function AuthRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

  if (!isAuthenticated && !isPublicRoute) {
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
        <Route element={<AuthRedirect />}>
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
              <Route
                path="/inventory"
                element={(
                  <RoleGuard
                    allowedRoles={[
                      'system_admin',
                      'warehouse_officer',
                      'production_supervisor',
                      'sales_executive',
                      'export_coordinator',
                      'management_viewer',
                    ]}
                  >
                    <InventoryPage />
                  </RoleGuard>
                )}
              />
              <Route
                path="/orders"
                element={(
                  <RoleGuard
                    allowedRoles={[
                      'system_admin',
                      'sales_executive',
                      'export_coordinator',
                      'warehouse_officer',
                      'management_viewer',
                    ]}
                  >
                    <OrdersPage />
                  </RoleGuard>
                )}
              />
              <Route
                path="/customers"
                element={(
                  <RoleGuard
                    allowedRoles={[
                      'system_admin',
                      'sales_executive',
                      'export_coordinator',
                      'management_viewer',
                    ]}
                  >
                    <CustomersPage />
                  </RoleGuard>
                )}
              />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route
                path="/reports"
                element={(
                  <RoleGuard
                    allowedRoles={[
                      'system_admin',
                      'management_viewer',
                      'procurement_officer',
                      'production_supervisor',
                      'qc_inspector',
                      'warehouse_officer',
                      'sales_executive',
                      'export_coordinator',
                    ]}
                  >
                    <ReportsPage />
                  </RoleGuard>
                )}
              />
              <Route
                path="/users"
                element={(
                  <RoleGuard allowedRoles={['system_admin']}>
                    <UsersPage />
                  </RoleGuard>
                )}
              />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}