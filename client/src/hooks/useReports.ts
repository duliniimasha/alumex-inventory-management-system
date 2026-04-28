import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  getAgingStock,
  getExportTraceability,
  getProductionSummary,
  getQcPassRate,
  getReorderAlerts,
  getSalesSummary,
  getStockSummary,
  getStockTurnover,
  getTopProducts,
} from '../api/reports.api';
import type {
  AgingStockItem,
  ExportTraceabilityReport,
  ProductionSummaryReport,
  QcPassRateReport,
  ReportDateRange,
  ReorderAlertsReport,
  SalesSummaryReport,
  StockSummaryReport,
  StockTurnoverReport,
  TopProductsReport,
} from '../types/reports.types';

export type ReportType =
  | 'stock_summary'
  | 'aging_stock'
  | 'stock_turnover'
  | 'production_summary'
  | 'qc_pass_rate'
  | 'sales_summary'
  | 'top_products'
  | 'reorder_alerts'
  | 'export_traceability';

const DEFAULT_AGING_DAYS = 90;

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildDefaultDateRange(): ReportDateRange {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    from_date: formatDate(start),
    to_date: formatDate(end),
    period: 'daily',
  };
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

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [headers, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\n');
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildReportFilename(report: ReportType, range?: ReportDateRange): string {
  const base = report.replace(/_/g, '-');

  if (range?.from_date && range?.to_date) {
    return `${base}-${range.from_date}-to-${range.to_date}.csv`;
  }

  return `${base}.csv`;
}

export function useReports() {
  const [activeReport, setActiveReportState] = useState<ReportType>('stock_summary');
  const [dateRange, setDateRangeState] = useState<ReportDateRange>(
    buildDefaultDateRange(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stockSummary, setStockSummary] = useState<StockSummaryReport | null>(null);
  const [agingStock, setAgingStock] = useState<AgingStockItem[] | null>(null);
  const [agingDaysThreshold, setAgingDaysThreshold] = useState(DEFAULT_AGING_DAYS);
  const [stockTurnover, setStockTurnover] = useState<StockTurnoverReport | null>(null);
  const [productionSummary, setProductionSummary] = useState<ProductionSummaryReport | null>(
    null,
  );
  const [qcPassRate, setQcPassRate] = useState<QcPassRateReport | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsReport | null>(null);
  const [reorderAlerts, setReorderAlerts] = useState<ReorderAlertsReport | null>(null);
  const [traceabilityOrderId, setTraceabilityOrderId] = useState('');
  const [traceabilityResult, setTraceabilityResult] =
    useState<ExportTraceabilityReport | null>(null);

  const fetchReportByType = useCallback(
    async (
      report: ReportType,
      range: ReportDateRange,
      agingDays: number,
      orderId?: string,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        switch (report) {
          case 'stock_summary': {
            const data = await getStockSummary();
            setStockSummary(data);
            break;
          }
          case 'aging_stock': {
            const data = await getAgingStock(agingDays);
            setAgingStock(data);
            break;
          }
          case 'stock_turnover': {
            const data = await getStockTurnover(range);
            setStockTurnover(data);
            break;
          }
          case 'production_summary': {
            const data = await getProductionSummary(range);
            setProductionSummary(data);
            break;
          }
          case 'qc_pass_rate': {
            const data = await getQcPassRate(range);
            setQcPassRate(data);
            break;
          }
          case 'sales_summary': {
            const data = await getSalesSummary(range);
            setSalesSummary(data);
            break;
          }
          case 'top_products': {
            const data = await getTopProducts(range);
            setTopProducts(data);
            break;
          }
          case 'reorder_alerts': {
            const data = await getReorderAlerts();
            setReorderAlerts(data);
            break;
          }
          case 'export_traceability': {
            if (!orderId) {
              throw new Error('Order ID is required for export traceability.');
            }

            const data = await getExportTraceability(orderId);
            setTraceabilityResult(data);
            break;
          }
          default:
            break;
        }
      } catch (fetchError) {
        setError(getErrorMessage(fetchError, 'Failed to fetch report data.'));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const setActiveReport = useCallback(
    (report: ReportType) => {
      setActiveReportState(report);
      void fetchReportByType(report, dateRange, agingDaysThreshold, traceabilityOrderId);
    },
    [agingDaysThreshold, dateRange, fetchReportByType, traceabilityOrderId],
  );

  const setDateRange = useCallback(
    (range: ReportDateRange) => {
      setDateRangeState(range);
      void fetchReportByType(activeReport, range, agingDaysThreshold, traceabilityOrderId);
    },
    [activeReport, agingDaysThreshold, fetchReportByType, traceabilityOrderId],
  );

  const setAgingDays = useCallback(
    (days: number) => {
      setAgingDaysThreshold(days);
      void fetchReportByType('aging_stock', dateRange, days, traceabilityOrderId);
    },
    [dateRange, fetchReportByType, traceabilityOrderId],
  );

  const fetchActiveReport = useCallback(async () => {
    await fetchReportByType(activeReport, dateRange, agingDaysThreshold, traceabilityOrderId);
  }, [activeReport, agingDaysThreshold, dateRange, fetchReportByType, traceabilityOrderId]);

  const fetchTraceability = useCallback(
    async (orderId: string) => {
      setTraceabilityOrderId(orderId);
      await fetchReportByType('export_traceability', dateRange, agingDaysThreshold, orderId);
    },
    [agingDaysThreshold, dateRange, fetchReportByType],
  );

  const exportReportCsv = useCallback(() => {
    setError(null);

    switch (activeReport) {
      case 'aging_stock': {
        if (!agingStock?.length) {
          setError('No aging stock data to export.');
          return;
        }

        const headers = [
          'Item ID',
          'Product SKU',
          'Product Name',
          'Category',
          'Warehouse Zone',
          'Location Code',
          'Quantity',
          'Unit',
          'Last Moved At',
          'Days Since Movement',
          'Received At',
        ];
        const rows = agingStock.map((item) => [
          item.item_id,
          item.product_sku,
          item.product_name,
          item.category,
          item.warehouse_zone,
          item.location_code,
          item.quantity,
          item.unit,
          item.last_moved_at ?? '',
          item.days_since_movement,
          item.received_at,
        ]);
        const csv = buildCsv(headers, rows);
        downloadCsv(csv, buildReportFilename(activeReport, dateRange));
        return;
      }
      case 'reorder_alerts': {
        if (!reorderAlerts?.alerts.length) {
          setError('No reorder alert data to export.');
          return;
        }

        const headers = [
          'Material ID',
          'Material Type',
          'Grade',
          'Current Qty',
          'Reorder Level',
          'Shortage',
          'Shortage Percent',
          'Supplier Name',
          'Supplier Country',
          'Supplier Email',
        ];
        const rows = reorderAlerts.alerts.map((alert) => [
          alert.material_id,
          alert.material_type,
          alert.grade ?? '',
          alert.current_qty,
          alert.reorder_level,
          alert.shortage,
          alert.shortage_percent,
          alert.supplier.name,
          alert.supplier.country,
          alert.supplier.contact_email,
        ]);
        const csv = buildCsv(headers, rows);
        downloadCsv(csv, buildReportFilename(activeReport, dateRange));
        return;
      }
      case 'top_products': {
        if (!topProducts?.products.length) {
          setError('No top products data to export.');
          return;
        }

        const headers = [
          'Rank',
          'Product ID',
          'SKU',
          'Name',
          'Category',
          'Total Dispatched Qty',
          'Unit',
          'Order Count',
        ];
        const rows = topProducts.products.map((product) => [
          product.rank,
          product.product_id,
          product.sku,
          product.name,
          product.category,
          product.total_dispatched_qty,
          product.unit,
          product.order_count,
        ]);
        const csv = buildCsv(headers, rows);
        downloadCsv(csv, buildReportFilename(activeReport, dateRange));
        return;
      }
      case 'sales_summary': {
        if (!salesSummary?.trend_data.length) {
          setError('No sales trend data to export.');
          return;
        }

        const headers = ['Period', 'Order Count', 'Total Value'];
        const rows = salesSummary.trend_data.map((point) => [
          point.period_label,
          point.order_count,
          point.total_value,
        ]);
        const csv = buildCsv(headers, rows);
        downloadCsv(csv, buildReportFilename(activeReport, dateRange));
        return;
      }
      default:
        setError('CSV export is not available for this report.');
    }
  }, [activeReport, agingStock, dateRange, reorderAlerts, salesSummary, topProducts]);

  return {
    activeReport,
    dateRange,
    isLoading,
    error,
    stockSummary,
    agingStock,
    agingDaysThreshold,
    stockTurnover,
    productionSummary,
    qcPassRate,
    salesSummary,
    topProducts,
    reorderAlerts,
    traceabilityOrderId,
    traceabilityResult,
    setActiveReport,
    setDateRange,
    setAgingDays,
    fetchActiveReport,
    fetchTraceability,
    exportReportCsv,
  };
}
