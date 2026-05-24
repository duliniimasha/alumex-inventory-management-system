import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { submitStocktake } from '../api/inventory.api';
import type {
  InventoryItem,
  StocktakeEntry,
  StocktakeResult,
} from '../types/inventory.types';

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useStocktake() {
  const [entries, setEntries] = useState<Map<string, number>>(() => new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<StocktakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const setCount = useCallback((itemId: string, quantity: number) => {
    setEntries((previousEntries) => {
      const nextEntries = new Map(previousEntries);
      nextEntries.set(itemId, quantity);
      return nextEntries;
    });

    setIsDirty(true);
  }, []);

  const removeEntry = useCallback((itemId: string) => {
    setEntries((previousEntries) => {
      const nextEntries = new Map(previousEntries);
      nextEntries.delete(itemId);
      setIsDirty(nextEntries.size > 0);
      return nextEntries;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries(new Map());
    setResult(null);
    setError(null);
    setIsDirty(false);
  }, []);

  const submit = useCallback(async () => {
    if (entries.size === 0) {
      const message = 'Add at least one stocktake entry before submitting.';
      setError(message);
      toast.error(message);
      return false;
    }

    const payload: StocktakeEntry[] = Array.from(entries.entries()).map(
      ([item_id, counted_quantity]) => ({
        item_id,
        counted_quantity,
      }),
    );

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitStocktake(payload);
      setResult(response);
      toast.success(
        `${response.processed} items counted, ${response.flagged_count} discrepancies flagged`,
      );
      return true;
    } catch (submitError) {
      const message = getErrorMessage(submitError, 'Failed to submit stocktake.');
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [entries]);

  const importFromTable = useCallback((items: InventoryItem[]) => {
    const nextEntries = new Map<string, number>();

    items.forEach((item) => {
      nextEntries.set(item.id, item.quantity);
    });

    setEntries(nextEntries);
    setIsDirty(nextEntries.size > 0);
  }, []);

  const entryCount = entries.size;
  const hasDiscrepancies = (result?.discrepancies.length ?? 0) > 0;
  const flaggedCount = result?.flagged_count ?? 0;

  return {
    entries,
    isSubmitting,
    result,
    error,
    isDirty,
    entryCount,
    hasDiscrepancies,
    flaggedCount,
    setCount,
    removeEntry,
    clearAll,
    submit,
    importFromTable,
  };
}
