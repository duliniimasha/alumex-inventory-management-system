import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  adjustStock,
  getInventoryItems,
  getProducts,
  receiveStock,
  transferStock,
} from '../api/inventory.api';
import { getProductionJobs } from '../api/production.api';
import { useRoleAccess } from './useRoleAccess';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  AdjustStockDto,
  InventoryFilters,
  InventoryItem,
  ProductCategory,
  ReceiveStockDto,
  TransferStockDto,
  WarehouseZone,
} from '../types/inventory.types';

interface ProductSelectOption {
  value: string;
  label: string;
  category: string;
}

interface JobSelectOption {
  value: string;
  label: string;
}

type PaginationMeta = PaginatedResponse<InventoryItem>['pagination'];

type FilterKey = keyof InventoryFilters;

type ZoneSummary = Record<WarehouseZone, { count: number; totalQty: number }>;

type CategorySummary = Record<ProductCategory, number>;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: InventoryFilters = {
  page: 1,
  limit: 10,
};

const WAREHOUSE_ZONES: WarehouseZone[] = [
  'main',
  'export',
  'quarantine',
  'dispatch',
  'returns',
];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'architectural',
  'household',
  'hardware',
  'industrial',
  'trading',
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

function buildZoneSummary(items: InventoryItem[]): ZoneSummary {
  const summary = WAREHOUSE_ZONES.reduce<ZoneSummary>(
    (accumulator, zone) => {
      accumulator[zone] = { count: 0, totalQty: 0 };
      return accumulator;
    },
    {} as ZoneSummary,
  );

  for (const item of items) {
    summary[item.warehouse_zone].count += 1;
    summary[item.warehouse_zone].totalQty += item.quantity;
  }

  return summary;
}

function buildCategorySummary(items: InventoryItem[]): CategorySummary {
  const summary = PRODUCT_CATEGORIES.reduce<CategorySummary>(
    (accumulator, category) => {
      accumulator[category] = 0;
      return accumulator;
    },
    {} as CategorySummary,
  );

  for (const item of items) {
    const category = item.product?.category ?? 'trading';
    summary[category] += item.quantity;
  }

  return summary;
}

function canModifyExportZone(role: string) {
  return role === 'export_coordinator' || role === 'system_admin';
}

export function useInventory() {
  const { currentRole } = useRoleAccess();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [productsForSelect, setProductsForSelect] = useState<ProductSelectOption[]>([]);
  const [productionJobsForSelect, setProductionJobsForSelect] = useState<JobSelectOption[]>([]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getInventoryItems(filters);
      setItems(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch inventory items.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchProductsForSelect = useCallback(async () => {
    try {
      const response = await getProducts({ page: 1, limit: 200 });
      setProductsForSelect(
        response.data.map((product) => ({
          value: product.id,
          label: product.sku ? `${product.sku} — ${product.name}` : product.name,
          category: product.category,
        })),
      );
    } catch {
      setProductsForSelect([]);
    }
  }, []);

  const fetchProductionJobsForSelect = useCallback(async () => {
    try {
      const response = await getProductionJobs({
        status: 'completed',
        page: 1,
        limit: 200,
      });

      setProductionJobsForSelect(
        response.data.map((job) => ({
          value: job.id,
          label: job.process_type ? `${job.id} - ${job.process_type}` : job.id,
        })),
      );
    } catch {
      setProductionJobsForSelect([]);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    void fetchProductsForSelect();
  }, [fetchProductsForSelect]);

  useEffect(() => {
    void fetchProductionJobsForSelect();
  }, [fetchProductionJobsForSelect]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: InventoryFilters[K]) => {
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

  const handleReceive = useCallback(
    async (dto: ReceiveStockDto) => {
      setError(null);

      try {
        await receiveStock(dto);
        toast.success('Stock received successfully');
        await fetchItems();
        return true;
      } catch (receiveError) {
        const message = getErrorMessage(receiveError, 'Failed to receive stock.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchItems],
  );

  const handleTransfer = useCallback(
    async (id: string, dto: TransferStockDto) => {
      setError(null);

      const sourceItem = items.find((item) => item.id === id);
      const exportTouched =
        dto.warehouse_zone === 'export' || sourceItem?.warehouse_zone === 'export';

      if (exportTouched && !canModifyExportZone(currentRole)) {
        const message =
          'Only export_coordinator or system_admin can modify export stock.';
        setError(message);
        toast.error(message);
        return false;
      }

      try {
        await transferStock(id, dto);
        toast.success('Inventory transferred successfully');
        return true;
      } catch (transferError) {
        const message = getErrorMessage(transferError, 'Failed to transfer inventory.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [currentRole, items],
  );

  const handleAdjust = useCallback(async (id: string, dto: AdjustStockDto) => {
    setError(null);

    try {
      await adjustStock(id, dto);
      toast.success('Stock adjusted successfully');
      return true;
    } catch (adjustError) {
      const message = getErrorMessage(adjustError, 'Failed to adjust stock.');
      setError(message);
      toast.error(message);
      return false;
    }
  }, []);

  const zoneSummary = useMemo(() => buildZoneSummary(items), [items]);
  const categorySummary = useMemo(() => buildCategorySummary(items), [items]);
  const totalStockValue = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  return {
    items,
    isLoading,
    error,
    pagination,
    filters,
    zoneSummary,
    categorySummary,
    totalStockValue,
    productsForSelect,
    productionJobsForSelect,
    fetchItems,
    handleFilterChange,
    handlePageChange,
    handleReceive,
    handleTransfer,
    handleAdjust,
  };
}
