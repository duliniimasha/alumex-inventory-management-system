import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getProducts } from '../api/inventory.api';
import {
  cancelOrder,
  dispatchOrder,
  getCustomers,
  getOrders,
  getOrderSummaryStats,
  returnOrder,
} from '../api/sales.api';
import type { PaginatedResponse } from '../types/supplier.types';
import type { Product } from '../types/inventory.types';
import type {
  Customer,
  DispatchOrderDto,
  OrderFilters,
  OrderStatus,
  OrderSummaryStats,
  ReturnOrderDto,
  SalesOrder,
} from '../types/sales.types';

type PaginationMeta = PaginatedResponse<SalesOrder>['pagination'];

type FilterKey = keyof OrderFilters;

interface CustomerSelectOption {
  value: string;
  label: string;
  type: string;
}

interface ProductSelectOption {
  value: string;
  label: string;
  category: Product['category'];
  unit: string;
}

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

const DEFAULT_FILTERS: OrderFilters = {
  page: 1,
  limit: 10,
};

const DISPATCH_READY_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'picking'];

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function buildStatusCounts(orders: SalesOrder[]): Record<OrderStatus, number> {
  return orders.reduce<Record<OrderStatus, number>>(
    (counts, order) => {
      counts[order.status] += 1;
      return counts;
    },
    {
      pending: 0,
      confirmed: 0,
      picking: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    },
  );
}

function toCustomerOption(customer: Customer): CustomerSelectOption {
  return {
    value: customer.id,
    label: customer.name,
    type: customer.type,
  };
}

function toProductOption(product: Product): ProductSelectOption {
  const label = product.sku
    ? `${product.sku} — ${product.name}`
    : product.name;

  return {
    value: product.id,
    label,
    category: product.category,
    unit: product.unit,
  };
}

function toOrderTimestamp(order: SalesOrder): number {
  if (!order.order_date) {
    return 0;
  }

  const parsed = new Date(order.order_date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function useOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [stats, setStats] = useState<OrderSummaryStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [customersForSelect, setCustomersForSelect] = useState<CustomerSelectOption[]>([]);
  const [productsForSelect, setProductsForSelect] = useState<ProductSelectOption[]>([]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getOrders(filters);
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch sales orders.'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);

    try {
      const response = await getOrderSummaryStats(
        filters.from_date,
        filters.to_date,
      );
      setStats(response);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to load order summary.'));
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, [filters]);

  const fetchCustomersForSelect = useCallback(async () => {
    try {
      const response = await getCustomers({ page: 1, limit: 200 });
      setCustomersForSelect(response.data.map(toCustomerOption));
    } catch {
      setCustomersForSelect([]);
    }
  }, []);

  const fetchProductsForSelect = useCallback(async () => {
    try {
      const response = await getProducts({ page: 1, limit: 200 });
      setProductsForSelect(response.data.map(toProductOption));
    } catch {
      setProductsForSelect([]);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchCustomersForSelect();
  }, [fetchCustomersForSelect]);

  useEffect(() => {
    void fetchProductsForSelect();
  }, [fetchProductsForSelect]);

  const handleFilterChange = useCallback(
    <K extends FilterKey>(key: K, value: OrderFilters[K]) => {
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

  const handleDispatch = useCallback(
    async (id: string, dto: DispatchOrderDto) => {
      setError(null);

      try {
        const updated = await dispatchOrder(id, dto);
        setOrders((currentOrders) =>
          currentOrders.map((order) => (order.id === id ? updated : order)),
        );
        toast.success('Order dispatched successfully');
        await fetchStats();
        return true;
      } catch (dispatchError) {
        const message = getErrorMessage(dispatchError, 'Failed to dispatch order.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchStats],
  );

  const handleCancel = useCallback(
    async (id: string, reason: string) => {
      setError(null);

      try {
        const updated = await cancelOrder(id, reason);
        setOrders((currentOrders) =>
          currentOrders.map((order) => (order.id === id ? updated : order)),
        );
        toast.success('Order cancelled — reserved stock has been released');
        await fetchStats();
        return true;
      } catch (cancelError) {
        const message = getErrorMessage(cancelError, 'Failed to cancel order.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchStats],
  );

  const handleReturn = useCallback(
    async (id: string, dto: ReturnOrderDto) => {
      setError(null);

      try {
        const updated = await returnOrder(id, dto);
        setOrders((currentOrders) =>
          currentOrders.map((order) => (order.id === id ? updated : order)),
        );
        toast.success('Return processed — stock restored to inventory');
        await fetchStats();
        return true;
      } catch (returnError) {
        const message = getErrorMessage(returnError, 'Failed to process return.');
        setError(message);
        toast.error(message);
        return false;
      }
    },
    [fetchStats],
  );

  const statusCounts = useMemo(() => buildStatusCounts(orders), [orders]);

  const pendingDispatchOrders = useMemo(() => {
    return [...orders]
      .filter((order) => DISPATCH_READY_STATUSES.includes(order.status))
      .sort((a, b) => toOrderTimestamp(a) - toOrderTimestamp(b));
  }, [orders]);

  return {
    orders,
    isLoading,
    error,
    pagination,
    filters,
    stats,
    isStatsLoading,
    statusCounts,
    pendingDispatchOrders,
    customersForSelect,
    productsForSelect,
    fetchOrders,
    fetchStats,
    fetchCustomersForSelect,
    handleFilterChange,
    handlePageChange,
    handleDispatch,
    handleCancel,
    handleReturn,
  };
}
