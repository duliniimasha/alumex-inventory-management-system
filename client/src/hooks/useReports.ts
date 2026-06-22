import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  exportCustomersReport,
  exportSuppliersReport,
} from '../api/reports.api';

export type ReportKind = 'customers' | 'suppliers';

async function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): Promise<string> {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    // Blob responses (responseType: 'blob') carry the JSON error as a Blob.
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        // fall through to defaults
      }
    } else if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: string }).message;
      if (message) {
        return message;
      }
    }

    return error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useReports() {
  const [exporting, setExporting] = useState<ReportKind | null>(null);

  const runExport = useCallback(
    async (kind: ReportKind, action: () => Promise<void>) => {
      setExporting(kind);

      try {
        await action();
        toast.success(`${kind === 'customers' ? 'Customers' : 'Suppliers'} report downloaded`);
      } catch (error) {
        const message = await getErrorMessage(
          error,
          'Failed to generate the report.',
        );
        toast.error(message);
      } finally {
        setExporting(null);
      }
    },
    [],
  );

  const exportCustomers = useCallback(
    () => runExport('customers', exportCustomersReport),
    [runExport],
  );

  const exportSuppliers = useCallback(
    () => runExport('suppliers', exportSuppliersReport),
    [runExport],
  );

  return {
    exporting,
    exportCustomers,
    exportSuppliers,
  };
}
