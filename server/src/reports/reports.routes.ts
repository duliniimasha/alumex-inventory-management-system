export const REPORTS_ROUTES = {
  BASE: 'reports',
  CUSTOMERS_EXPORT: 'customers-export',
  SUPPLIERS_EXPORT: 'suppliers-export',
  SALES_EXPORT: 'sales-export',
  INCOME_EXPORT: 'income-export',
  TAX_EXPORT: 'tax-export',
  CUSTOMERS_CHARTS: 'customers-charts',
  SUPPLIERS_CHARTS: 'suppliers-charts',
  SALES_CHARTS: 'sales-charts',
  INCOME_CHARTS: 'income-charts',
  TAX_CHARTS: 'tax-charts',
} as const;

export interface ReportDateRange {
  fromDate?: Date;
  toDate?: Date;
}
