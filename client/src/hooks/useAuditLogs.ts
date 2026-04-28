import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { getAuditLogs } from '../api/users.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type { AuditLog, AuditLogFilters } from '../types/user.types';

type PaginationMeta = PaginatedResponse<AuditLog>['pagination'];

type FilterKey = keyof AuditLogFilters;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: AuditLogFilters = {
  page: 1,
  limit: 10,
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<AuditLogFilters>(DEFAULT_FILTERS);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAuditLogs(filters);
      setLogs(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch audit logs.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: AuditLogFilters[K]) => {
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

  return {
    logs,
    isLoading,
    error,
    pagination,
    filters,
    fetchLogs,
    handleFilterChange,
    handlePageChange,
  };
}
