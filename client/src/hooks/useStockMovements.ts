import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { getStockMovements } from '../api/inventory.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type { StockMovement, StockMovementFilters } from '../types/inventory.types';

type PaginationMeta = PaginatedResponse<StockMovement>['pagination'];

type FilterKey = keyof StockMovementFilters;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: StockMovementFilters = {
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

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<StockMovementFilters>(DEFAULT_FILTERS);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getStockMovements(filters);
      setMovements(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch stock movements.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchMovements();
  }, [fetchMovements]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: StockMovementFilters[K]) => {
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
    movements,
    isLoading,
    error,
    pagination,
    filters,
    fetchMovements,
    handleFilterChange,
    handlePageChange,
  };
}
