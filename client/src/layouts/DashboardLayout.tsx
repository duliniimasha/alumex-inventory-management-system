import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Factory, LayoutDashboard, MoreHorizontal, ShoppingCart, Warehouse } from 'lucide-react';
import Header from '../components/layout/Header';
import Sidebar, { navItems } from '../components/layout/Sidebar';
import { useAuthStore } from '../store/auth.store';

interface DashboardLayoutProps {
  children?: ReactNode;
}

const DESKTOP_BREAKPOINT = 1024;
const ROUTE_PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/raw-materials': 'Raw Materials',
  '/production': 'Production',
  '/inventory': 'Inventory',
  '/orders': 'Sales Orders',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports',
  '/users': 'User Management',
};

function getIsDesktop() {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.innerWidth >= DESKTOP_BREAKPOINT;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.user?.role ?? '');
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [sidebarOpen, setSidebarOpen] = useState(getIsDesktop);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const appName = import.meta.env.VITE_APP_NAME ?? 'ALUMEX IMS';
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '1.0.0';

  useEffect(() => {
    const onResize = () => {
      const nextIsDesktop = getIsDesktop();
      setIsDesktop((previous) => {
        if (previous !== nextIsDesktop) {
          setSidebarOpen(nextIsDesktop);
        }

        return nextIsDesktop;
      });
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleMenuToggle = () => {
    setSidebarOpen((previous) => !previous);
  };

  const handleSidebarClose = () => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const handleMoreClose = () => {
    setIsMoreOpen(false);
  };

  const pageTitle = ROUTE_PAGE_TITLES[location.pathname] ?? 'Dashboard';

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.roles.includes('all') || item.roles.includes(userRole)),
    [userRole],
  );

  const bottomNavPaths = useMemo(
    () => ['/dashboard', '/inventory', '/orders', '/production'],
    [],
  );

  const extraNavItems = useMemo(
    () => visibleNavItems.filter((item) => !bottomNavPaths.includes(item.path)),
    [bottomNavPaths, visibleNavItems],
  );

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        appName={appName}
        appVersion={appVersion}
      />

      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarOpen ? 'lg:pl-[260px]' : 'lg:pl-0'}`}>
        <header
          className={`fixed top-0 right-0 z-20 ${
            sidebarOpen ? 'left-0 lg:left-[260px]' : 'left-0'
          }`}
        >
          <Header onMenuToggle={handleMenuToggle} pageTitle={pageTitle} />
        </header>

        <main className="h-screen overflow-y-auto bg-slate-50 pt-16 pb-20 md:pb-6">
          <div className="p-4 md:p-6">{children ?? <Outlet />}</div>
        </main>
      </div>

      {isMoreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 md:hidden">
          <button
            type="button"
            aria-label="Close more menu"
            className="absolute inset-0"
            onClick={handleMoreClose}
          />
          <div className="relative w-full rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">More</p>
              <button
                type="button"
                onClick={handleMoreClose}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600"
              >
                Close
              </button>
            </div>
            <div className="space-y-1">
              {extraNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleMoreClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              {extraNavItems.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  No additional sections available.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-gray-200 bg-white px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
        <NavLink
          to="/dashboard"
          aria-label="Dashboard"
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center rounded-lg py-2 transition ${
              isActive ? 'text-amber-500' : 'text-gray-400'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5" />
        </NavLink>
        <NavLink
          to="/inventory"
          aria-label="Inventory"
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center rounded-lg py-2 transition ${
              isActive ? 'text-amber-500' : 'text-gray-400'
            }`
          }
        >
          <Warehouse className="h-5 w-5" />
        </NavLink>
        <NavLink
          to="/orders"
          aria-label="Orders"
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center rounded-lg py-2 transition ${
              isActive ? 'text-amber-500' : 'text-gray-400'
            }`
          }
        >
          <ShoppingCart className="h-5 w-5" />
        </NavLink>
        <NavLink
          to="/production"
          aria-label="Production"
          className={({ isActive }) =>
            `flex flex-1 items-center justify-center rounded-lg py-2 transition ${
              isActive ? 'text-amber-500' : 'text-gray-400'
            }`
          }
        >
          <Factory className="h-5 w-5" />
        </NavLink>
        <NavLink
          to="/more"
          aria-label="More"
          onClick={(event) => {
            event.preventDefault();
            setIsMoreOpen(true);
          }}
          className={() =>
            `flex flex-1 items-center justify-center rounded-lg py-2 transition ${
              isMoreOpen ? 'text-amber-500' : 'text-gray-400'
            }`
          }
        >
          <MoreHorizontal className="h-5 w-5" />
        </NavLink>
      </nav>
    </div>
  );
}
