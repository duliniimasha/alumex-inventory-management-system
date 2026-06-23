export interface NameValue {
  label: string;
  value: number;
}

export interface MoneyTotals {
  net: number;
  vat: number;
  gross: number;
}

export interface FinanceChartData {
  kind: 'sales' | 'income';
  totals: MoneyTotals;
  total_qty: number;
  order_count: number;
  by_channel: NameValue[];
  by_month: Array<{ label: string; net: number; gross: number }>;
  top_products: NameValue[];
}

export interface TaxChartData {
  kind: 'tax';
  rate: number;
  totals: MoneyTotals;
  vat_by_month: NameValue[];
  vat_by_channel: NameValue[];
}

export interface CustomersChartData {
  kind: 'customers';
  totals: {
    customers: number;
    orders: number;
    ordered_value: number;
    dispatched_value: number;
    outstanding_value: number;
  };
  top_customers: NameValue[];
  value_by_type: NameValue[];
}

export interface SuppliersChartData {
  kind: 'suppliers';
  totals: {
    suppliers: number;
    materials: number;
    total_qty: number;
    below_reorder: number;
  };
  top_suppliers: NameValue[];
  qty_by_category: NameValue[];
}

export type ReportChartData =
  | FinanceChartData
  | TaxChartData
  | CustomersChartData
  | SuppliersChartData;
