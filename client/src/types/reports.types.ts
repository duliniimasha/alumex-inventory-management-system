import type { ProductCategory, WarehouseZone } from './inventory.types';
import type { JobStatus, ProcessType } from './production.types';
import type { OrderChannel } from './sales.types';

export interface StockSummaryReport {
  categories: {
    category: ProductCategory;
    total_items: number;
    total_quantity: number;
    below_reorder_count: number;
  }[];
  grand_total_items: number;
  grand_total_quantity: number;
  total_below_reorder: number;
}

export interface AgingStockItem {
  item_id: string;
  product_sku: string;
  product_name: string;
  category: ProductCategory;
  warehouse_zone: WarehouseZone;
  location_code: string;
  quantity: number;
  unit: string;
  last_moved_at: string | null;
  days_since_movement: number;
  received_at: string;
}

export interface StockTurnoverReport {
  from_date: string;
  to_date: string;
  by_category: {
    category: ProductCategory;
    opening_qty: number;
    received_qty: number;
    dispatched_qty: number;
    closing_qty: number;
    turnover_rate: number;
  }[];
}

export interface ProductionSummaryReport {
  from_date: string;
  to_date: string;
  by_status: Record<JobStatus, number>;
  by_process_type: {
    process_type: ProcessType;
    job_count: number;
    total_input_kg: number;
    total_output_kg: number;
    avg_yield_percent: number;
  }[];
  total_jobs: number;
  completion_rate: number;
}

export interface QcPassRateReport {
  from_date: string;
  to_date: string;
  overall: {
    pass: number;
    hold: number;
    reject: number;
    pass_rate: number;
  };
  by_process_type: {
    process_type: ProcessType;
    pass: number;
    hold: number;
    reject: number;
    pass_rate: number;
    total: number;
  }[];
}

export interface SalesSummaryReport {
  from_date: string;
  to_date: string;
  period: 'daily' | 'weekly' | 'monthly';
  total_orders: number;
  total_value: number;
  total_units_dispatched: number;
  by_channel: Record<
    OrderChannel,
    {
      order_count: number;
      total_value: number;
      units_dispatched: number;
    }
  >;
  trend_data: {
    period_label: string;
    order_count: number;
    total_value: number;
  }[];
}

export interface TopProductsReport {
  from_date: string;
  to_date: string;
  products: {
    rank: number;
    product_id: string;
    sku: string;
    name: string;
    category: ProductCategory;
    total_dispatched_qty: number;
    unit: string;
    order_count: number;
  }[];
}

export interface ReorderAlertsReport {
  alerts: {
    material_id: string;
    material_type: string;
    grade: string | null;
    current_qty: number;
    reorder_level: number;
    shortage: number;
    shortage_percent: number;
    supplier: {
      id: string;
      name: string;
      country: string;
      contact_email: string;
    };
  }[];
  total_alerts: number;
}

export interface ExportTraceabilityReport {
  order_id: string;
  order_ref: string;
  customer: {
    name: string;
    country: string;
    type: string;
  };
  dispatch_date: string | null;
  lines: {
    line_id: string;
    product_sku: string;
    product_name: string;
    qty_dispatched: number;
    inventory_item: {
      id: string;
      location_code: string;
      warehouse_zone: string;
      received_at: string;
      production_job: {
        id: string;
        process_type: string;
        completed_at: string | null;
        qc_inspections: {
          result: string;
          inspector_name: string;
          inspected_at: string;
        }[];
        raw_material: {
          id: string;
          material_type: string;
          grade: string | null;
          supplier: {
            name: string;
            country: string;
            certification: string | null;
          };
        } | null;
      } | null;
    } | null;
  }[];
}

export interface ReportDateRange {
  from_date: string;
  to_date: string;
  period?: 'daily' | 'weekly' | 'monthly';
}
