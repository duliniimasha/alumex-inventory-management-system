import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import {
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { changePassword, logoutUser } from '../../api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';

interface HeaderProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

type AccountModal = 'profile' | 'settings' | null;
type PasswordField = 'current_password' | 'new_password' | 'confirm_password';

interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  current_password: '',
  new_password: '',
  confirm_password: '',
};

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

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function getPasswordValidationError(form: PasswordFormState): string | null {
  if (!form.current_password) {
    return 'Enter your current password.';
  }

  if (form.new_password.length < 8) {
    return 'New password must be at least 8 characters.';
  }

  if (!/[A-Z]/.test(form.new_password)) {
    return 'New password must contain at least one uppercase letter.';
  }

  if (!/[0-9]/.test(form.new_password)) {
    return 'New password must contain at least one number.';
  }

  if (!/[^A-Za-z0-9]/.test(form.new_password)) {
    return 'New password must contain at least one special character.';
  }

  if (form.new_password !== form.confirm_password) {
    return 'New password and confirmation must match.';
  }

  if (form.current_password === form.new_password) {
    return 'New password must be different from your current password.';
  }

  return null;
}

export default function Header({ onMenuToggle, pageTitle = 'Dashboard' }: HeaderProps) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<AccountModal>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<Record<PasswordField, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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

  const handleSignOut = async () => {
    const shouldSignOut = window.confirm('Are you sure you want to sign out?');

    if (!shouldSignOut) {
      return;
    }

    await logoutUser();
    clearAuth();
    setIsDropdownOpen(false);
    navigate('/login', { replace: true });
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen((previous) => !previous);
  };

  const openModal = (modal: AccountModal) => {
    setIsDropdownOpen(false);
    setActiveModal(modal);
    setPasswordError(null);
  };

  const closeModal = () => {
    if (isChangingPassword) {
      return;
    }

    setActiveModal(null);
    setPasswordError(null);
    setPasswordForm(EMPTY_PASSWORD_FORM);
  };

  const handlePasswordChange = (field: PasswordField, value: string) => {
    setPasswordForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setPasswordError(null);
  };

  const togglePasswordVisibility = (field: PasswordField) => {
    setVisiblePasswordFields((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = getPasswordValidationError(passwordForm);

    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    try {
      await changePassword(passwordForm);
      toast.success('Password changed successfully');
      setPasswordForm(EMPTY_PASSWORD_FORM);
      setActiveModal('profile');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to change password.');
      setPasswordError(message);
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderPasswordInput = (
    field: PasswordField,
    label: string,
    placeholder: string,
    autoComplete: string,
  ) => (
    <FormField label={label} required>
      <div className="flex items-center rounded-lg border border-gray-300 bg-white pr-2 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/50">
        <input
          type={visiblePasswordFields[field] ? 'text' : 'password'}
          value={passwordForm[field]}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(event) => handlePasswordChange(field, event.target.value)}
          disabled={isChangingPassword}
          className="h-11 w-full border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
        />
        <button
          type="button"
          className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          onClick={() => togglePasswordVisibility(field)}
          aria-label={visiblePasswordFields[field] ? 'Hide password' : 'Show password'}
        >
          {visiblePasswordFields[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  );

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
                onClick={() => openModal('profile')}
              >
                <User className="h-4 w-4" />
                My Profile
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                onClick={() => openModal('settings')}
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

      <Modal
        isOpen={activeModal === 'profile'}
        onClose={closeModal}
        title="My Profile"
        size="md"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-lg font-semibold text-white">
              {avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-gray-900">{user?.name ?? 'Unknown User'}</p>
              <p className="text-sm text-gray-500">{formattedRole}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                <Mail className="h-3.5 w-3.5" />
                Email
              </div>
              <p className="break-words text-sm font-medium text-gray-900">{user?.email ?? 'Not available'}</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Department
              </div>
              <p className="text-sm font-medium text-gray-900">{user?.department ?? 'Not specified'}</p>
            </div>
          </div>

        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'settings'}
        onClose={closeModal}
        title="Settings"
        size="md"
      >
        <form className="space-y-5" onSubmit={handlePasswordSubmit} noValidate>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <KeyRound className="h-4 w-4 text-amber-600" />
              Change Password
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Use your current password to protect account changes.
            </p>
          </div>

          {renderPasswordInput('current_password', 'Current Password', 'Enter current password', 'current-password')}
          {renderPasswordInput('new_password', 'New Password', 'Create a new password', 'new-password')}
          {renderPasswordInput('confirm_password', 'Confirm Password', 'Re-enter new password', 'new-password')}

          {passwordError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {passwordError}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={isChangingPassword}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
