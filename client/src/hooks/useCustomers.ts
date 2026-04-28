import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { createCustomer, getCustomers, updateCustomer } from '../api/sales.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  CreateCustomerDto,
  Customer,
  CustomerFilters,
  UpdateCustomerDto,
} from '../types/sales.types';

type PaginationMeta = PaginatedResponse<Customer>['pagination'];

type FilterKey = keyof CustomerFilters;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: CustomerFilters = {
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

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);

  const countriesInUse = useMemo(() => {
    const unique = new Set(
      customers
        .map((customer) => customer.country)
        .filter((country) => Boolean(country && country.trim())),
    );

    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }, [customers]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getCustomers(filters);
      setCustomers(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch customers.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: CustomerFilters[K]) => {
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
    async (dto: CreateCustomerDto) => {
      setError(null);

      try {
        await createCustomer(dto);
        toast.success('Customer created successfully.');
        await fetchCustomers();
        return true;
      } catch (createError) {
        const message = getErrorMessage(createError, 'Failed to create customer.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchCustomers],
  );

  const handleUpdate = useCallback(
    async (id: string, dto: UpdateCustomerDto) => {
      setError(null);

      try {
        await updateCustomer(id, dto);
        toast.success('Customer updated successfully.');
        await fetchCustomers();
        return true;
      } catch (updateError) {
        const message = getErrorMessage(updateError, 'Failed to update customer.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchCustomers],
  );

  return {
    customers,
    isLoading,
    error,
    pagination,
    filters,
    countriesInUse,
    fetchCustomers,
    handleFilterChange,
    handlePageChange,
    handleCreate,
    handleUpdate,
  };
}
