import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { deleteSupplier, getSuppliers } from '../api/supplier.api';
import type {
  PaginatedResponse,
  Supplier,
  SupplierFilters,
} from '../types/supplier.types';

type SupplierPagination = PaginatedResponse<Supplier>['pagination'];

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<SupplierPagination | null>(null);
  const [filters, setFilters] = useState<SupplierFilters>({
    page: 1,
    limit: 10,
  });

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getSuppliers(filters);
      setSuppliers(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch suppliers.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  const handleFilterChange = useCallback((nextFilters: Partial<SupplierFilters>) => {
    setFilters((previousFilters) => {
      const mergedFilters = {
        ...previousFilters,
        ...nextFilters,
      };

      if (!Object.prototype.hasOwnProperty.call(nextFilters, 'page')) {
        mergedFilters.page = 1;
      }

      return mergedFilters;
    });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      page,
    }));
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const previousSuppliers = suppliers;
      const previousPagination = pagination;

      setError(null);
      setSuppliers((currentSuppliers) =>
        currentSuppliers.filter((supplier) => supplier.id !== id),
      );
      setPagination((currentPagination) => {
        if (!currentPagination) {
          return currentPagination;
        }

        const nextTotal = Math.max(currentPagination.total - 1, 0);

        return {
          ...currentPagination,
          total: nextTotal,
          totalPages: Math.max(Math.ceil(nextTotal / currentPagination.limit), 1),
        };
      });

      try {
        await deleteSupplier(id);
        return true;
      } catch (deleteError) {
        setSuppliers(previousSuppliers);
        setPagination(previousPagination);
        setError(getErrorMessage(deleteError, 'Failed to delete supplier.'));
        return false;
      }
    },
    [pagination, suppliers],
  );

  return {
    suppliers,
    isLoading,
    error,
    pagination,
    filters,
    fetchSuppliers,
    handleFilterChange,
    handlePageChange,
    handleDelete,
  };
}