import api from './axios';
import type {
  CustomersChartData,
  FinanceChartData,
  SuppliersChartData,
  TaxChartData,
} from '../types/reports.types';

export interface ReportRange {
  from_date?: string;
  to_date?: string;
}

interface ChartResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  if (!disposition) {
    return fallback;
  }

  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return match?.[1] ?? fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function rangeParams(range?: ReportRange): Record<string, string> {
  const params: Record<string, string> = {};

  if (range?.from_date) {
    params.from_date = range.from_date;
  }

  if (range?.to_date) {
    params.to_date = range.to_date;
  }

  return params;
}

async function downloadWorkbook(
  path: string,
  fallbackName: string,
  range?: ReportRange,
): Promise<void> {
  const response = await api.get<Blob>(path, {
    responseType: 'blob',
    params: rangeParams(range),
  });
  const filename = filenameFromDisposition(
    response.headers['content-disposition'],
    fallbackName,
  );
  triggerBrowserDownload(response.data, filename);
}

export function exportCustomersReport(range?: ReportRange): Promise<void> {
  return downloadWorkbook(
    '/reports/customers-export',
    'customers-detailed-report.xlsx',
    range,
  );
}

export function exportSuppliersReport(range?: ReportRange): Promise<void> {
  return downloadWorkbook(
    '/reports/suppliers-export',
    'suppliers-detailed-report.xlsx',
    range,
  );
}

export function exportSalesReport(range?: ReportRange): Promise<void> {
  return downloadWorkbook('/reports/sales-export', 'sales-report.xlsx', range);
}

export function exportIncomeReport(range?: ReportRange): Promise<void> {
  return downloadWorkbook('/reports/income-export', 'income-report.xlsx', range);
}

export function exportTaxReport(range?: ReportRange): Promise<void> {
  return downloadWorkbook('/reports/tax-export', 'tax-report.xlsx', range);
}

async function getChartData<T>(path: string, range?: ReportRange): Promise<T> {
  const response = await api.get<ChartResponse<T>>(path, {
    params: rangeParams(range),
  });
  return response.data.data;
}

export function getCustomersCharts(
  range?: ReportRange,
): Promise<CustomersChartData> {
  return getChartData<CustomersChartData>('/reports/customers-charts', range);
}

export function getSuppliersCharts(
  range?: ReportRange,
): Promise<SuppliersChartData> {
  return getChartData<SuppliersChartData>('/reports/suppliers-charts', range);
}

export function getSalesCharts(range?: ReportRange): Promise<FinanceChartData> {
  return getChartData<FinanceChartData>('/reports/sales-charts', range);
}

export function getIncomeCharts(range?: ReportRange): Promise<FinanceChartData> {
  return getChartData<FinanceChartData>('/reports/income-charts', range);
}

export function getTaxCharts(range?: ReportRange): Promise<TaxChartData> {
  return getChartData<TaxChartData>('/reports/tax-charts', range);
}
