import {
  BarChart3,
  Factory,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  appVersion: string;
}

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles: string[];
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['all'],
  },
  {
    label: 'Raw Materials',
    icon: Package,
    path: '/raw-materials',
    roles: ['system_admin', 'procurement_officer', 'production_supervisor', 'management_viewer'],
  },
  {
    label: 'Production',
    icon: Factory,
    path: '/production',
    roles: ['system_admin', 'production_supervisor', 'qc_inspector', 'management_viewer'],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    path: '/inventory',
    roles: ['system_admin', 'warehouse_officer', 'production_supervisor', 'sales_executive', 'export_coordinator', 'management_viewer'],
  },
  {
    label: 'Sales Orders',
    icon: ShoppingCart,
    path: '/orders',
    roles: ['system_admin', 'sales_executive', 'export_coordinator', 'warehouse_officer', 'management_viewer'],
  },
  {
    label: 'Customers',
    icon: Users,
    path: '/customers',
    roles: ['system_admin', 'sales_executive', 'export_coordinator', 'management_viewer'],
  },
  {
    label: 'Suppliers',
    icon: Truck,
    path: '/suppliers',
    roles: ['system_admin', 'procurement_officer', 'management_viewer'],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    roles: ['system_admin', 'management_viewer', 'procurement_officer', 'production_supervisor', 'qc_inspector', 'warehouse_officer', 'sales_executive', 'export_coordinator'],
  },
  {
    label: 'User Management',
    icon: UserCog,
    path: '/users',
    roles: ['system_admin'],
  },
];

function getInitials(name: string | undefined): string {
  if (!name) {
    return 'U';
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'U';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export default function Sidebar({ isOpen, onClose, appName, appVersion }: SidebarProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const userRole = user?.role ?? '';

  const [primaryLabel, ...secondaryParts] = appName.split(' ').filter(Boolean);
  const secondaryLabel = secondaryParts.join(' ');

  const visibleNavItems = navItems.filter((item) => item.roles.includes('all') || item.roles.includes(userRole));

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleLogout = () => {
    const shouldLogout = window.confirm('Are you sure you want to log out?');

    if (!shouldLogout) {
      return;
    }

    clearAuth();
    navigate('/login', { replace: true });
    onClose();
  };

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 h-screen w-[260px] bg-slate-900 text-slate-100 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex h-full flex-col">
          <div className="px-4 pb-4 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-extrabold tracking-[0.08em]">
                  <span className="text-white">{primaryLabel ?? appName}</span>
                  {secondaryLabel ? (
                    <span className="text-amber-400"> {secondaryLabel}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">Inventory Management</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 h-px bg-amber-400/70" />
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'border-amber-400 bg-slate-800 text-amber-300'
                        : 'border-transparent bg-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 px-4 py-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-slate-900">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Unknown User'}</p>
                <p className="truncate text-xs text-slate-400">{user?.role ?? 'unknown_role'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400 hover:bg-slate-800 hover:text-amber-300"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>

            <p className="mt-3 text-center text-[11px] font-medium text-slate-500">
              v{appVersion}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
