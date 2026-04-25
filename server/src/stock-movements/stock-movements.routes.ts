export const STOCK_MOVEMENTS_ROUTES = {
  BASE: 'stock-movements',
} as const;

export interface StockMovementListFilters {
  movementType?: string;
  itemId?: string;
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
}
