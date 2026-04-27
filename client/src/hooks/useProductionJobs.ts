import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getDies } from '../api/die.api';
import {
  deleteProductionJob,
  getProductionJobs,
  updateProductionJob,
} from '../api/production.api';
import { getRawMaterials } from '../api/rawMaterial.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type { Die } from '../types/die.types';
import type {
  JobStatus,
  ProductionJob,
  ProductionJobFilters,
} from '../types/production.types';
import type { RawMaterial } from '../types/rawMaterial.types';

interface RawMaterialSelectOption {
  value: string;
  label: string;
  material_type?: string;
  grade?: string | null;
  quantity_kg?: number;
  reorder_level?: number;
}

interface DieSelectOption {
  value: string;
  label: string;
  condition?: string;
}

type PaginationMeta = PaginatedResponse<ProductionJob>['pagination'];

type FilterKey = keyof ProductionJobFilters;

type StatusCounts = Record<JobStatus, number>;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: ProductionJobFilters = {
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

function buildStatusCounts(jobs: ProductionJob[]): StatusCounts {
  return jobs.reduce<StatusCounts>(
    (counts, job) => {
      counts[job.status] += 1;
      return counts;
    },
    {
      pending: 0,
      in_progress: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
    },
  );
}

function toRawMaterialOption(material: RawMaterial): RawMaterialSelectOption {
  const label = material.grade
    ? `${material.grade} - ${material.material_type}`
    : material.material_type;

  return {
    value: material.id,
    label,
    material_type: material.material_type,
    grade: material.grade,
    quantity_kg: material.quantity_kg,
    reorder_level: material.reorder_level,
  };
}

function toDieOption(die: Die): DieSelectOption {
  return {
    value: die.id,
    label: die.profile_code,
    condition: die.condition,
  };
}

export function useProductionJobs() {
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<ProductionJobFilters>(DEFAULT_FILTERS);
  const [rawMaterialsForSelect, setRawMaterialsForSelect] = useState<RawMaterialSelectOption[]>([]);
  const [diesForSelect, setDiesForSelect] = useState<DieSelectOption[]>([]);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getProductionJobs(filters);
      setJobs(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch production jobs.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchRawMaterialsForSelect = useCallback(async () => {
    try {
      const response = await getRawMaterials({ page: 1, limit: 100 });
      setRawMaterialsForSelect(response.data.map(toRawMaterialOption));
    } catch {
      setRawMaterialsForSelect([]);
    }
  }, []);

  const fetchDiesForSelect = useCallback(async () => {
    try {
      const response = await getDies({ page: 1, limit: 100 });
      setDiesForSelect(response.data.map(toDieOption));
    } catch {
      setDiesForSelect([]);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    void fetchRawMaterialsForSelect();
  }, [fetchRawMaterialsForSelect]);

  useEffect(() => {
    void fetchDiesForSelect();
  }, [fetchDiesForSelect]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: ProductionJobFilters[K]) => {
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

  const handleStatusUpdate = useCallback(
    async (id: string, status: JobStatus) => {
      const previousJobs = jobs;

      setError(null);
      setJobs((currentJobs) =>
        currentJobs.map((job) => (job.id === id ? { ...job, status } : job)),
      );

      try {
        const updated = await updateProductionJob(id, { status });
        setJobs((currentJobs) =>
          currentJobs.map((job) => (job.id === id ? updated : job)),
        );
        return true;
      } catch (updateError) {
        setJobs(previousJobs);
        const message = getErrorMessage(updateError, 'Failed to update job status.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [jobs],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const targetJob = jobs.find((job) => job.id === id);

      if (!targetJob) {
        toast.error('Production job not found.');
        return false;
      }

      if (targetJob.status !== 'pending') {
        toast.error('Only pending jobs can be deleted.');
        return false;
      }

      const previousJobs = jobs;
      const previousPagination = pagination;

      setError(null);
      setJobs((currentJobs) => currentJobs.filter((job) => job.id !== id));
      setPagination((currentPagination) => {
        const nextTotal = Math.max(currentPagination.total - 1, 0);

        return {
          ...currentPagination,
          total: nextTotal,
          totalPages: Math.max(Math.ceil(nextTotal / currentPagination.limit), 1),
        };
      });

      try {
        await deleteProductionJob(id);
        return true;
      } catch (deleteError) {
        setJobs(previousJobs);
        setPagination(previousPagination);
        const message = getErrorMessage(deleteError, 'Failed to delete production job.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [jobs, pagination],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination((previousPagination) => ({
      ...previousPagination,
      page: DEFAULT_FILTERS.page ?? 1,
      limit: DEFAULT_FILTERS.limit ?? previousPagination.limit,
    }));
  }, []);

  const updateJobInState = useCallback((updatedJob: ProductionJob) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
    );
  }, []);

  const statusCounts = useMemo(() => buildStatusCounts(jobs), [jobs]);
  const activeJobsCount = useMemo(
    () => statusCounts.pending + statusCounts.in_progress,
    [statusCounts],
  );

  return {
    jobs,
    isLoading,
    error,
    pagination,
    filters,
    statusCounts,
    activeJobsCount,
    rawMaterialsForSelect,
    diesForSelect,
    fetchJobs,
    handleFilterChange,
    handlePageChange,
    handleStatusUpdate,
    handleDelete,
    resetFilters,
    updateJobInState,
  };
}
