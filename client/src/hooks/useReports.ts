import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  exportCustomersReport,
  exportIncomeReport,
  exportSalesReport,
  exportSuppliersReport,
  exportTaxReport,
  getCustomersCharts,
  getIncomeCharts,
  getSalesCharts,
  getSuppliersCharts,
  getTaxCharts,
  type ReportRange,
} from '../api/reports.api';
import type { ReportChartData } from '../types/reports.types';

export type ReportKind =
  | 'customers'
  | 'suppliers'
  | 'sales'
  | 'income'
  | 'tax';

const REPORT_LABELS: Record<ReportKind, string> = {
  customers: 'Customers',
  suppliers: 'Suppliers',
  sales: 'Sales',
  income: 'Income',
  tax: 'Tax',
};

const exporters: Record<ReportKind, (range?: ReportRange) => Promise<void>> = {
  customers: exportCustomersReport,
  suppliers: exportSuppliersReport,
  sales: exportSalesReport,
  income: exportIncomeReport,
  tax: exportTaxReport,
};

const chartFetchers: Record<
  ReportKind,
  (range?: ReportRange) => Promise<ReportChartData>
> = {
  customers: getCustomersCharts,
  suppliers: getSuppliersCharts,
  sales: getSalesCharts,
  income: getIncomeCharts,
  tax: getTaxCharts,
};

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [activeReport, setActiveReport] = useState<ReportKind | null>(null);
  const [chartData, setChartData] = useState<ReportChartData | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const requestId = useRef(0);

  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  const buildRange = useCallback(
    (): ReportRange => ({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    [fromDate, toDate],
  );

  useEffect(() => {
    if (!activeReport || invalidRange) {
      return;
    }

    const currentRequest = ++requestId.current;
    setIsChartLoading(true);
    setChartError(null);
    setChartData(null);

    chartFetchers[activeReport](buildRange())
      .then((data) => {
        if (currentRequest === requestId.current) {
          setChartData(data);
        }
      })
      .catch(async (error) => {
        if (currentRequest === requestId.current) {
          setChartData(null);
          setChartError(
            await getErrorMessage(error, 'Failed to load report charts.'),
          );
        }
      })
      .finally(() => {
        if (currentRequest === requestId.current) {
          setIsChartLoading(false);
        }
      });
  }, [activeReport, buildRange, invalidRange]);

  const exportReport = useCallback(
    async (kind: ReportKind) => {
      setExporting(kind);

      try {
        await exporters[kind](buildRange());
        toast.success(`${REPORT_LABELS[kind]} report downloaded`);
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
    [buildRange],
  );

  const clearRange = useCallback(() => {
    setFromDate('');
    setToDate('');
  }, []);

  return {
    exporting,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    clearRange,
    invalidRange,
    exportReport,
    activeReport,
    setActiveReport,
    chartData,
    isChartLoading,
    chartError,
  };
}
