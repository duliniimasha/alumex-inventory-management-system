import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { getSuppliers } from '../api/supplier.api';
import { deleteRawMaterial, getRawMaterials } from '../api/rawMaterial.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  RawMaterial,
  RawMaterialFilters,
} from '../types/rawMaterial.types';

type RawMaterialPagination = PaginatedResponse<RawMaterial>['pagination'];

interface SelectOption {
  value: string;
  label: string;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useRawMaterials() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<RawMaterialPagination | null>(null);
  const [filters, setFilters] = useState<RawMaterialFilters>({
    page: 1,
    limit: 10,
  });
  const [suppliersForSelect, setSuppliersForSelect] = useState<SelectOption[]>([]);

  const fetchRawMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getRawMaterials(filters);
      setRawMaterials(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch raw materials.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchSuppliersForSelect = useCallback(async () => {
    try {
      const response = await getSuppliers({ page: 1, limit: 100 });
      const options = response.data.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      }));
      setSuppliersForSelect(options);
    } catch {
      setSuppliersForSelect([]);
    }
  }, []);

  useEffect(() => {
    void fetchRawMaterials();
  }, [fetchRawMaterials]);

  useEffect(() => {
    void fetchSuppliersForSelect();
  }, [fetchSuppliersForSelect]);

  const handleFilterChange = useCallback((nextFilters: Partial<RawMaterialFilters>) => {
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
      const previousRawMaterials = rawMaterials;
      const previousPagination = pagination;

      setError(null);
      setRawMaterials((currentRawMaterials) =>
        currentRawMaterials.filter((material) => material.id !== id),
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
        await deleteRawMaterial(id);
        return true;
      } catch (deleteError) {
        setRawMaterials(previousRawMaterials);
        setPagination(previousPagination);
        setError(getErrorMessage(deleteError, 'Failed to delete raw material.'));
        return false;
      }
    },
    [pagination, rawMaterials],
  );

  const belowReorderCount = useMemo(
    () => rawMaterials.filter((material) => material.quantity_kg < material.reorder_level).length,
    [rawMaterials],
  );

  return {
    rawMaterials,
    isLoading,
    error,
    pagination,
    filters,
    belowReorderCount,
    suppliersForSelect,
    fetchRawMaterials,
    fetchSuppliersForSelect,
    handleFilterChange,
    handlePageChange,
    handleDelete,
  };
}