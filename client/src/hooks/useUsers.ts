import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  createUser,
  getUsers,
  resetUserPassword,
  toggleUserActive,
  updateUser,
} from '../api/users.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  CreateUserDto,
  ImsUser,
  ResetPasswordDto,
  RoleSlug,
  UpdateUserDto,
  UserFilters,
} from '../types/user.types';

type PaginationMeta = PaginatedResponse<ImsUser>['pagination'];

type FilterKey = keyof UserFilters;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: UserFilters = {
  page: 1,
  limit: 10,
};

const ROLE_SLUGS: RoleSlug[] = [
  'system_admin',
  'management_viewer',
  'warehouse_officer',
  'procurement_officer',
  'production_supervisor',
  'qc_inspector',
  'sales_executive',
  'export_coordinator',
];

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useUsers() {
  const [users, setUsers] = useState<ImsUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);

  const roleDistribution = useMemo(() => {
    const base = ROLE_SLUGS.reduce((acc, role) => {
      acc[role] = 0;
      return acc;
    }, {} as Record<RoleSlug, number>);

    return users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] ?? 0) + 1;
      return acc;
    }, base);
  }, [users]);

  const activeCount = useMemo(
    () => users.filter((user) => user.is_active).length,
    [users],
  );

  const inactiveCount = useMemo(
    () => users.filter((user) => !user.is_active).length,
    [users],
  );

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getUsers(filters);
      setUsers(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch users.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: UserFilters[K]) => {
      setFilters((previousFilters) => ({
        ...previousFilters,
        [key]: value,
        page: 1,
      }));

      setPagination((previousPagination) => ({
        ...previousPagination,
        page: 1,
      }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      page,
    }));

    setPagination((previousPagination) => ({
      ...previousPagination,
      page,
    }));
  }, []);

  const handleCreate = useCallback(
    async (dto: CreateUserDto) => {
      setError(null);

      try {
        await createUser(dto);
        toast.success(`User ${dto.name} created successfully`);
        await fetchUsers();
        return true;
      } catch (createError) {
        const message = getErrorMessage(createError, 'Failed to create user.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchUsers],
  );

  const handleUpdate = useCallback(
    async (id: string, dto: UpdateUserDto) => {
      setError(null);

      try {
        await updateUser(id, dto);
        toast.success('User updated');
        await fetchUsers();
        return true;
      } catch (updateError) {
        const message = getErrorMessage(updateError, 'Failed to update user.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchUsers],
  );

  const handleToggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      setError(null);

      const previousUsers = users;
      const targetUser = users.find((user) => user.id === id);
      const nextStatus = !currentStatus;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, is_active: nextStatus } : user,
        ),
      );

      try {
        const updated = await toggleUserActive(id, nextStatus);
        setUsers((prev) => prev.map((user) => (user.id === id ? updated : user)));
        const userName = updated.name ?? targetUser?.name ?? 'User';
        toast.success(`${userName} has been ${nextStatus ? 'activated' : 'deactivated'}`);
        return true;
      } catch (toggleError) {
        const message = getErrorMessage(toggleError, 'Failed to update user status.');
        setUsers(previousUsers);
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [users],
  );

  const handleResetPassword = useCallback(
    async (id: string, dto: ResetPasswordDto) => {
      setError(null);

      try {
        await resetUserPassword(id, dto);
        toast.success('Password reset successfully');
        return true;
      } catch (resetError) {
        const message = getErrorMessage(resetError, 'Failed to reset password.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [],
  );

  return {
    users,
    isLoading,
    error,
    pagination,
    filters,
    roleDistribution,
    activeCount,
    inactiveCount,
    fetchUsers,
    handleFilterChange,
    handlePageChange,
    handleCreate,
    handleUpdate,
    handleToggleActive,
    handleResetPassword,
  };
}
