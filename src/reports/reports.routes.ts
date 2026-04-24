export const REPORTS_ROUTES = {
  BASE: 'reports',
  STOCK_SUMMARY: 'stock-summary',
  AGING_STOCK: 'aging-stock',
  STOCK_TURNOVER: 'stock-turnover',
  PRODUCTION_SUMMARY: 'production-summary',
  QC_PASS_RATE: 'qc-pass-rate',
  SALES_SUMMARY: 'sales-summary',
  TOP_PRODUCTS: 'top-products',
  REORDER_ALERTS: 'reorder-alerts',
  EXPORT_TRACEABILITY: 'export-traceability/:orderId',
} as const;

export const SALES_PERIODS = ['daily', 'weekly', 'monthly'] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

export interface ReportDateRange {
  fromDate?: Date;
  toDate?: Date;
}
