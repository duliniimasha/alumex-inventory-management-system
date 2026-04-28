import type { Product } from './inventory.types';

export type OrderStatus =
  'pending' | 'confirmed' | 'picking' | 'dispatched' |
  'delivered' | 'cancelled' | 'returned';

export type OrderChannel =
  'local' | 'alumex_store' | 'export';

export type CustomerType =
  'b2b' | 'fabricator' | 'retail' | 'export' | 'government';

export type ReturnReason =
  'damaged' | 'wrong_item' | 'quality_issue' |
  'order_cancelled' | 'other';

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  country: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  _count?: {
    sales_orders: number;
  };
}

export interface OrderLine {
  id: string;
  order_id: string;
  product_id: string;
  qty_ordered: number;
  qty_dispatched: number;
  unit_price: number;
  product?: Product;
  reserved_item_id?: string | null;
}

export interface SalesOrder {
  id: string;
  customer_id: string;
  channel: OrderChannel;
  status: OrderStatus;
  order_date: string;
  dispatch_date: string | null;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  order_lines?: OrderLine[];
  owner?: {
    id: string;
    name: string;
    role: string;
  };
  _count?: {
    order_lines: number;
  };
}

export interface CreateOrderDto {
  customer_id: string;
  channel: OrderChannel;
  order_lines: {
    product_id: string;
    qty_ordered: number;
    unit_price: number;
  }[];
}

export interface AddOrderLineDto {
  product_id: string;
  qty_ordered: number;
  unit_price: number;
}

export interface UpdateOrderLineDto {
  qty_ordered?: number;
  unit_price?: number;
}

export interface DispatchOrderDto {
  dispatch_date?: string;
  notes?: string;
}

export interface ReturnOrderDto {
  reason: ReturnReason;
  notes?: string;
  lines: {
    line_id: string;
    qty_returned: number;
  }[];
}

export interface CreateCustomerDto {
  name: string;
  type: CustomerType;
  country: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export interface OrderFilters {
  status?: OrderStatus | '';
  channel?: OrderChannel | '';
  customer_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CustomerFilters {
  type?: CustomerType | '';
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderSummaryStats {
  totalOrders: number;
  pendingOrders: number;
  dispatchedToday: number;
  totalValue: number;
  byChannel: Record<OrderChannel, number>;
  byStatus: Record<OrderStatus, number>;
}
