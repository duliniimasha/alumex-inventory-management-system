export const SALES_ORDERS_ROUTES = {
  BASE: 'orders',
  BY_ID: ':id',
  DISPATCH: ':id/dispatch',
  CANCEL: ':id/cancel',
  RETURN: ':id/return',
  LINES: ':orderId/lines',
  LINE_BY_ID: 'lines/:id',
} as const;

export const SALES_CHANNELS = ['local', 'alumex_store', 'export'] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const ORDER_STATUSES = [
  'pending',
  'dispatched',
  'cancelled',
  'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface SalesOrderListFilters {
  status?: OrderStatus;
  channel?: SalesChannel;
  customerId?: string;
  ownerUserId?: string;
  startDate?: Date;
  endDate?: Date;
}
