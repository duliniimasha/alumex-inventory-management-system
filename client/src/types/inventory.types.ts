export type ProductCategory =
  'architectural' | 'household' | 'hardware' | 'industrial' | 'trading';

export type FinishType =
  'mill_finish' | 'powder_coated' | 'anodized' | 'wood_finish' | 'other';

export type WarehouseZone =
  'main' | 'export' | 'quarantine' | 'dispatch' | 'returns';

export type MovementType =
  'receive' | 'dispatch' | 'transfer' | 'adjustment' |
  'return' | 'stocktake_correction';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  finish_type: FinishType;
  length_mm: number | null;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  job_id: string | null;
  quantity: number;
  location_code: string;
  warehouse_zone: WarehouseZone;
  received_at: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  production_job?: {
    id: string;
    process_type: string;
    completed_at: string | null;
  };
}

export interface StockMovement {
  id: string;
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  reason: string | null;
  performed_by: string;
  moved_at: string;
  inventory_item?: InventoryItem;
  user?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface StocktakeEntry {
  item_id: string;
  counted_quantity: number;
}

export interface StocktakeResult {
  processed: number;
  discrepancies: {
    item_id: string;
    system_quantity: number;
    counted_quantity: number;
    variance: number;
    variance_percent: number;
    flagged_for_review: boolean;
    product_name: string;
    location_code: string;
  }[];
  no_variance_count: number;
  flagged_count: number;
}

export interface ReceiveStockDto {
  product_id: string;
  job_id?: string;
  quantity: number;
  location_code: string;
  warehouse_zone: WarehouseZone;
}

export interface TransferStockDto {
  location_code: string;
  warehouse_zone: WarehouseZone;
  reason?: string;
}

export interface AdjustStockDto {
  quantity: number;
  reason: string;
}

export interface InventoryFilters {
  product_id?: string;
  category?: ProductCategory | '';
  warehouse_zone?: WarehouseZone | '';
  location_code?: string;
  search?: string;
  low_stock?: boolean;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface StockMovementFilters {
  movement_type?: MovementType | '';
  item_id?: string;
  performed_by?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}
