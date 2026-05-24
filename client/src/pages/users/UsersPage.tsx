import clsx from 'clsx';
import {
  History,
  MoreVertical,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AuditLogViewer from '../../components/users/AuditLogViewer';
import ResetPasswordForm from '../../components/users/ResetPasswordForm';
import RoleStatChip from '../../components/users/RoleStatChip';
import UserActivityCard from '../../components/users/UserActivityCard';
import UserForm from '../../components/users/UserForm';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useDebounce, usePageTitle, useRoleAccess, useUsers } from '../../hooks';
import type {
  CreateUserDto,
  ImsUser,
  ResetPasswordDto,
  RoleSlug,
  UpdateUserDto,
} from '../../types/user.types';
import { formatDate, formatNumber, getRoleBadgeColor, toTitleCase } from '../../utils/formatters';

type UserModalMode = 'create' | 'edit' | 'detail' | 'reset' | 'audit' | null;

type StatusFilterValue = 'all' | 'active' | 'inactive';

const ROLE_SLUGS: RoleSlug[] = [
  'system_admin',
  'procurement_officer',
  'production_supervisor',
  'qc_inspector',
  'warehouse_officer',
  'sales_executive',
  'export_coordinator',
  'management_viewer',
];

function UserActions({
  user,
  onViewDetails,
  onEdit,
  onResetPassword,
  onToggleActive,
  onViewAudit,
}: {
  user: ImsUser;
  onViewDetails: (user: ImsUser) => void;
  onEdit: (user: ImsUser) => void;
  onResetPassword: (user: ImsUser) => void;
  onToggleActive: (user: ImsUser) => void;
  onViewAudit: (user: ImsUser) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="User actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewDetails(user))}
          >
            View Details
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onEdit(user))}
          >
            Edit User
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onResetPassword(user))}
          >
            Reset Password
          </button>

          <div className="border-t border-gray-100" />

          <button
            type="button"
            className={clsx(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              user.is_active
                ? 'text-amber-700 hover:bg-amber-50'
                : 'text-emerald-700 hover:bg-emerald-50',
            )}
            onClick={() => handleAction(() => onToggleActive(user))}
          >
            {user.is_active ? 'Deactivate Account' : 'Activate Account'}
          </button>

          <div className="border-t border-gray-100" />

          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-blue-50"
            onClick={() => handleAction(() => onViewAudit(user))}
          >
            View Audit Log
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  usePageTitle('User Management');

  const navigate = useNavigate();
  const { currentRole } = useRoleAccess();
  const redirectGuard = useRef(false);
  const {
    users,
    isLoading,
    error,
    pagination,
    filters,
    roleDistribution,
    inactiveCount,
    handleFilterChange,
    handlePageChange,
    handleCreate,
    handleUpdate,
    handleToggleActive,
    handleResetPassword,
  } = useUsers();

  const [modalMode, setModalMode] = useState<UserModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<ImsUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [departmentValue, setDepartmentValue] = useState(filters.department ?? '');
  const [statusValue, setStatusValue] = useState<StatusFilterValue>('all');
  const [confirmTarget, setConfirmTarget] = useState<ImsUser | null>(null);

  useEffect(() => {
    if (redirectGuard.current) {
      return;
    }

    if (currentRole !== 'system_admin') {
      redirectGuard.current = true;
      toast.error('Access denied. System administrators only.');
      navigate('/dashboard', { replace: true });
    }
  }, [currentRole, navigate]);

  const debouncedSearchValue = useDebounce(searchValue, 400);

  useEffect(() => {
    const normalizedSearch = debouncedSearchValue.trim();

    if ((filters.search ?? '') !== normalizedSearch) {
      handleFilterChange('search', normalizedSearch || undefined);
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  useEffect(() => {
    if ((filters.department ?? '') !== departmentValue) {
      handleFilterChange('department', departmentValue || undefined);
    }
  }, [departmentValue, filters.department, handleFilterChange]);

  useEffect(() => {
    const desiredValue =
      statusValue === 'all'
        ? ''
        : statusValue === 'active'
          ? true
          : false;

    if (filters.is_active !== desiredValue) {
      handleFilterChange('is_active', desiredValue === '' ? '' : desiredValue);
    }
  }, [filters.is_active, handleFilterChange, statusValue]);

  const totalUsers = users.length;

  const departmentOptions = useMemo(() => {
    const unique = new Set(
      users
        .map((user) => user.department?.trim())
        .filter((value) => Boolean(value)),
    );

    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }, [users]);

  const activeRole = filters.role ?? '';

  const activeFilterCount =
    Number(Boolean(searchValue.trim())) +
    Number(Boolean(filters.department)) +
    Number(Boolean(filters.is_active !== '' && filters.is_active !== undefined)) +
    Number(Boolean(activeRole));

  const page = pagination?.page ?? filters.page ?? 1;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  const columns: Column<ImsUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
              row.is_active ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400',
            )}
          >
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p
              className={clsx(
                'text-sm font-medium',
                !row.is_active && 'text-gray-400 line-through',
              )}
            >
              {row.name}
            </p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge label={toTitleCase(row.role)} color={getRoleBadgeColor(row.role)} />
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => row.department ?? <span className="text-gray-400">-</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <Badge label={row.is_active ? 'Active' : 'Inactive'} color={row.is_active ? 'green' : 'red'} />
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => formatDate(row.created_at),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <UserActions
          user={row}
          onViewDetails={(user) => {
            setSelectedUser(user);
            setModalMode('detail');
          }}
          onEdit={(user) => {
            setSelectedUser(user);
            setModalMode('edit');
          }}
          onResetPassword={(user) => {
            setSelectedUser(user);
            setModalMode('reset');
          }}
          onToggleActive={(user) => {
            if (user.is_active) {
              setConfirmTarget(user);
              return;
            }
            void handleToggleActive(user.id, user.is_active);
          }}
          onViewAudit={(user) => {
            setSelectedUser(user);
            setModalMode('audit');
          }}
        />
      ),
    },
  ];

  const openCreateModal = () => {
    setSelectedUser(null);
    setModalMode('create');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
  };

  const handleCreateSubmit = async (dto: CreateUserDto | UpdateUserDto) => {
    if (!('email' in dto) || !('password' in dto)) {
      return;
    }

    setIsSubmitting(true);
    const success = await handleCreate(dto as CreateUserDto);
    setIsSubmitting(false);

    if (success) {
      closeModal();
    }
  };

  const handleEditSubmit = async (dto: CreateUserDto | UpdateUserDto) => {
    if (!selectedUser) {
      return;
    }

    setIsSubmitting(true);
    const success = await handleUpdate(selectedUser.id, dto as UpdateUserDto);
    setIsSubmitting(false);

    if (success) {
      closeModal();
    }
  };

  const handleResetSubmit = async (dto: ResetPasswordDto) => {
    if (!selectedUser) {
      return;
    }

    setIsSubmitting(true);
    const success = await handleResetPassword(selectedUser.id, dto);
    setIsSubmitting(false);

    if (success) {
      closeModal();
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!confirmTarget) {
      return;
    }

    await handleToggleActive(confirmTarget.id, confirmTarget.is_active);
    setConfirmTarget(null);
  };

  const isAllChipActive = !activeRole && statusValue === 'all';
  const isInactiveChipActive = statusValue === 'inactive';

  return (
    <section className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users, roles and permissions"
        breadcrumbs={[{ label: 'User Management', path: '/users' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              onClick={() => {
                setSelectedUser(null);
                setModalMode('audit');
              }}
            >
              <History className="h-4 w-4" />
              Audit Log
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
              onClick={openCreateModal}
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => {
            handleFilterChange('role', '');
            handleFilterChange('is_active', '');
            setStatusValue('all');
          }}
          className={clsx(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
            isAllChipActive
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          <span>All Users</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
            {formatNumber(totalUsers)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleFilterChange('role', '');
            handleFilterChange('is_active', false);
            setStatusValue('inactive');
          }}
          className={clsx(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
            isInactiveChipActive
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          <span>Inactive</span>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
            {formatNumber(inactiveCount)}
          </span>
        </button>

        {ROLE_SLUGS.map((role) => (
          <RoleStatChip
            key={role}
            role={role}
            count={roleDistribution[role] ?? 0}
            isActive={activeRole === role}
            onClick={() => {
              handleFilterChange('role', role);
              handleFilterChange('is_active', '');
              setStatusValue('all');
            }}
          />
        ))}
      </div>

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          setDepartmentValue('');
          setStatusValue('all');
          handleFilterChange('search', undefined);
          handleFilterChange('department', undefined);
          handleFilterChange('is_active', '');
          handleFilterChange('role', '');
        }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search name or email"
          className="h-10 w-full min-w-55 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-sm"
        />

        <select
          value={departmentValue}
          onChange={(event) => setDepartmentValue(event.target.value)}
          className="h-10 min-w-45 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          <option value="">All Departments</option>
          {departmentOptions.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>

        <select
          value={statusValue}
          onChange={(event) => setStatusValue(event.target.value as StatusFilterValue)}
          className="h-10 min-w-45 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterBar>

      {error ? <ErrorAlert message={error} /> : null}

      {!isLoading && users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12">
          <EmptyState
            icon={Users}
            title="No users found"
            description={searchValue.trim() ? 'Try a different search term.' : 'Create your first system user.'}
            action={!searchValue.trim() ? {
              label: 'Add User',
              onClick: openCreateModal,
              icon: UserPlus,
            } : undefined}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="No users found."
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1 || isLoading}
        >
          Previous
        </button>

        <p className="text-sm font-medium text-gray-600">
          Page {page} of {totalPages}
        </p>

        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
        >
          Next
        </button>
      </div>

      <Modal
        isOpen={modalMode === 'create'}
        onClose={closeModal}
        title="Create User"
        size="md"
      >
        <UserForm
          mode="create"
          onSubmit={handleCreateSubmit}
          onCancel={closeModal}
          isSubmitting={isSubmitting}
        />
      </Modal>

      <Modal
        isOpen={modalMode === 'edit'}
        onClose={closeModal}
        title="Edit User"
        size="md"
      >
        {selectedUser ? (
          <UserForm
            mode="edit"
            initialData={selectedUser}
            onSubmit={handleEditSubmit}
            onCancel={closeModal}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === 'detail'}
        onClose={closeModal}
        title="User Details"
        size="lg"
      >
        {selectedUser ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-base font-semibold text-gray-900">Profile</h3>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Name</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Email</p>
                    <p className="mt-1 font-medium text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Role</p>
                    <p className="mt-1 font-medium text-gray-900">{toTitleCase(selectedUser.role)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Department</p>
                    <p className="mt-1 font-medium text-gray-900">
                      {selectedUser.department ?? 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Status</p>
                    <Badge
                      label={selectedUser.is_active ? 'Active' : 'Inactive'}
                      color={selectedUser.is_active ? 'green' : 'red'}
                    />
                  </div>
                </div>
              </div>

              <UserActivityCard user={selectedUser} />
            </div>

            <div>
              <AuditLogViewer userId={selectedUser.id} showUserFilter={false} maxHeight="400px" />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === 'reset'}
        onClose={closeModal}
        title="Reset Password"
        size="sm"
      >
        {selectedUser ? (
          <ResetPasswordForm
            userId={selectedUser.id}
            userName={selectedUser.name}
            onSubmit={handleResetSubmit}
            onCancel={closeModal}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === 'audit'}
        onClose={closeModal}
        title={selectedUser ? `Audit Log - ${selectedUser.name}` : 'System Audit Log'}
        size="xl"
      >
        <AuditLogViewer
          userId={selectedUser ? selectedUser.id : undefined}
          showUserFilter={!selectedUser}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleDeactivateConfirm}
        title={confirmTarget ? `Deactivate ${confirmTarget.name}?` : 'Deactivate account?'}
        message={
          confirmTarget
            ? `${confirmTarget.name} will no longer be able to log in.`
            : 'This account will no longer be able to log in.'
        }
        confirmLabel="Deactivate"
        variant="warning"
      />
    </section>
  );
}
