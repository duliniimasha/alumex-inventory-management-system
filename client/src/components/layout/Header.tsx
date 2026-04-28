import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface HeaderProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

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

function formatRoleSlug(role: string | undefined): string {
  if (!role) {
    return 'Unknown Role';
  }

  return role
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

export default function Header({ onMenuToggle, pageTitle = 'Dashboard' }: HeaderProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const avatarInitials = useMemo(() => getInitials(user?.name), [user?.name]);
  const formattedRole = useMemo(() => formatRoleSlug(user?.role), [user?.role]);

  const handleSignOut = () => {
    const shouldSignOut = window.confirm('Are you sure you want to sign out?');

    if (!shouldSignOut) {
      return;
    }

    clearAuth();
    setIsDropdownOpen(false);
    navigate('/login', { replace: true });
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen((previous) => !previous);
  };

  return (
    <div className="flex h-16 w-full items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:border-amber-400 hover:text-amber-600"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="truncate text-base font-semibold text-gray-800 sm:text-lg">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden h-8 w-px bg-gray-200 sm:block" />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleDropdownToggle}
            className="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-gray-100"
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
              {avatarInitials}
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-800">{user?.name ?? 'Unknown User'}</p>
              <p className="text-xs text-gray-500">{formattedRole}</p>
            </div>

            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {isDropdownOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                onClick={() => {
                  setIsDropdownOpen(false);
                }}
              >
                <User className="h-4 w-4" />
                My Profile
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                onClick={() => {
                  setIsDropdownOpen(false);
                }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>

              <div className="my-1 h-px bg-gray-200" />

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
