import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
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
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [sidebarOpen, setSidebarOpen] = useState(getIsDesktop);

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

  const pageTitle = ROUTE_PAGE_TITLES[location.pathname] ?? 'Dashboard';

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
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      <div className={`min-h-screen transition-[padding] duration-300 ${sidebarOpen ? 'lg:pl-[260px]' : 'lg:pl-0'}`}>
        <header
          className={`fixed top-0 right-0 z-20 ${
            sidebarOpen ? 'left-0 lg:left-[260px]' : 'left-0'
          }`}
        >
          <Header onMenuToggle={handleMenuToggle} pageTitle={pageTitle} />
        </header>

        <main className="h-screen overflow-y-auto bg-slate-50 pt-16">
          <div className="p-4 md:p-6">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}
