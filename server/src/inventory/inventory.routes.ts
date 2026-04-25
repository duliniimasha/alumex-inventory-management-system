export const INVENTORY_ROUTES = {
  BASE: 'inventory',
  BY_ID: ':id',
  RECEIVE: 'receive',
  TRANSFER: ':id/transfer',
} as const;

export interface InventoryListFilters {
  productId?: string;
  warehouseZone?: string;
  locationCode?: string;
  receivedStartDate?: Date;
  receivedEndDate?: Date;
}
