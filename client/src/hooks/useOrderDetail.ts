import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  addOrderLine,
  deleteOrderLine,
  getOrderById,
  updateOrderLine,
} from '../api/sales.api';
import { useRoleAccess } from './useRoleAccess';
import type {
  AddOrderLineDto,
  SalesOrder,
  UpdateOrderLineDto,
} from '../types/sales.types';

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useOrderDetail(orderId: string | null) {
  const { currentRole } = useRoleAccess();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getOrderById(orderId);
      setOrder(response);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch sales order.'));
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  const handleAddLine = useCallback(
    async (dto: AddOrderLineDto) => {
      if (!orderId) {
        return false;
      }

      setIsUpdating(true);
      setError(null);

      try {
        await addOrderLine(orderId, dto);
        toast.success('Line added');
        await fetchOrder();
        return true;
      } catch (addError) {
        const message = getErrorMessage(addError, 'Failed to add order line.');
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [fetchOrder, orderId],
  );

  const handleUpdateLine = useCallback(
    async (lineId: string, dto: UpdateOrderLineDto) => {
      setIsUpdating(true);
      setError(null);

      try {
        await updateOrderLine(lineId, dto);
        toast.success('Line updated');
        await fetchOrder();
        return true;
      } catch (updateError) {
        const message = getErrorMessage(updateError, 'Failed to update order line.');
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [fetchOrder],
  );

  const handleDeleteLine = useCallback((lineId: string) => {
    setLineToDelete(lineId);
  }, []);

  const confirmDeleteLine = useCallback(async () => {
    if (!lineToDelete) {
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await deleteOrderLine(lineToDelete);
      toast.success('Line removed — stock reservation released');
      await fetchOrder();
      setLineToDelete(null);
      return true;
    } catch (deleteError) {
      const message = getErrorMessage(deleteError, 'Failed to remove order line.');
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [fetchOrder, lineToDelete]);

  const cancelDeleteLine = useCallback(() => {
    setLineToDelete(null);
  }, []);

  const orderTotal = useMemo(() => {
    if (!order?.order_lines) {
      return 0;
    }

    return order.order_lines.reduce(
      (sum, line) => sum + line.qty_ordered * line.unit_price,
      0,
    );
  }, [order]);

  const totalItems = useMemo(() => {
    if (!order?.order_lines) {
      return 0;
    }

    return order.order_lines.reduce((sum, line) => sum + line.qty_ordered, 0);
  }, [order]);

  const isEditable = order?.status === 'pending';

  const canDispatch = useMemo(() => {
    if (!order) {
      return false;
    }

    const canDispatchRole = ['warehouse_officer', 'export_coordinator', 'system_admin']
      .includes(currentRole);

    return canDispatchRole && (order.status === 'confirmed' || order.status === 'picking');
  }, [currentRole, order]);

  return {
    order,
    isLoading,
    error,
    isUpdating,
    orderTotal,
    totalItems,
    isEditable,
    canDispatch,
    isDeleteConfirmOpen: Boolean(lineToDelete),
    lineToDelete,
    fetchOrder,
    handleAddLine,
    handleUpdateLine,
    handleDeleteLine,
    confirmDeleteLine,
    cancelDeleteLine,
  };
}
