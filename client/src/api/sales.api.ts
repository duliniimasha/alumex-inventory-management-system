import api from './axios';
import type { PaginatedResponse } from '../types/supplier.types';
import type { FinishType, Product, ProductCategory } from '../types/inventory.types';
import type {
  AddOrderLineDto,
  CreateCustomerDto,
  CreateOrderDto,
  Customer,
  CustomerFilters,
  CustomerType,
  DispatchOrderDto,
  OrderChannel,
  OrderFilters,
  OrderLine,
  OrderStatus,
  OrderSummaryStats,
  ReturnOrderDto,
  SalesOrder,
  UpdateCustomerDto,
  UpdateOrderLineDto,
} from '../types/sales.types';

interface CustomerApiModel {
  id: string;
  name: string;
  type?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  ownerUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  _count?: {
    salesOrders?: number;
  } | null;
}

interface CustomerDetailsApiModel extends CustomerApiModel {
  orderHistorySummary?: Record<string, unknown>;
}

interface ProductApiModel {
  id: string;
  sku?: string;
  name?: string;
  category?: string | null;
  finishType?: string | null;
  lengthMm?: number | null;
  unit?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface OrderLineApiModel {
  id: string;
  orderId: string;
  productId: string;
  qtyOrdered: number;
  qtyDispatched?: number | null;
  unitPrice: number;
  product?: ProductApiModel | null;
  reservedItemId?: string | null;
}

interface SalesOrderApiModel {
  id: string;
  customerId: string;
  channel?: string | null;
  status?: string | null;
  orderDate?: string | null;
  dispatchDate?: string | null;
  ownerUserId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  customer?: CustomerApiModel | null;
  orderLines?: OrderLineApiModel[] | null;
  owner?: {
    id: string;
    name: string;
    role: string;
  } | null;
  lineCount?: number | null;
  _count?: {
    orderLines?: number;
  } | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ListResponse<T> {
  success: boolean;
  message: string;
  data: T[];
}

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'picking',
  'dispatched',
  'delivered',
  'cancelled',
  'returned',
];

const ORDER_CHANNELS: OrderChannel[] = ['local', 'alumex_store', 'export'];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'architectural',
  'household',
  'hardware',
  'industrial',
  'trading',
];

const FINISH_TYPES: FinishType[] = [
  'mill_finish',
  'powder_coated',
  'anodized',
  'wood_finish',
  'other',
];

function createCountRecord<T extends string>(keys: T[]): Record<T, number> {
  return keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<T, number>);
}

function normalizeKey(value?: string | null): string {
  return value?.trim().toLowerCase().replace(/\s+/g, '_') ?? '';
}

function toCustomerType(value?: string | null): CustomerType {
  const normalized = normalizeKey(value);

  if (normalized === 'b2b') {
    return 'b2b';
  }

  if (normalized === 'fabricator') {
    return 'fabricator';
  }

  if (normalized === 'export') {
    return 'export';
  }

  if (normalized === 'government') {
    return 'government';
  }

  return 'retail';
}

function toApiCustomerType(value?: CustomerType): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value === 'b2b') {
    return 'B2B';
  }

  return value;
}

function toOrderChannel(value?: string | null): OrderChannel {
  switch (normalizeKey(value)) {
    case 'alumex_store':
      return 'alumex_store';
    case 'export':
      return 'export';
    case 'local':
    default:
      return 'local';
  }
}

function toOrderStatus(value?: string | null): OrderStatus {
  switch (normalizeKey(value)) {
    case 'confirmed':
      return 'confirmed';
    case 'picking':
      return 'picking';
    case 'dispatched':
      return 'dispatched';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    case 'returned':
      return 'returned';
    case 'pending':
    default:
      return 'pending';
  }
}

function toProductCategory(value?: string | null): ProductCategory {
  const normalized = normalizeKey(value);

  if (PRODUCT_CATEGORIES.includes(normalized as ProductCategory)) {
    return normalized as ProductCategory;
  }

  if (normalized === 'architecture') {
    return 'architectural';
  }

  return 'trading';
}

function toFinishType(value?: string | null): FinishType {
  const normalized = normalizeKey(value);

  if (FINISH_TYPES.includes(normalized as FinishType)) {
    return normalized as FinishType;
  }

  if (normalized === 'powder_coating') {
    return 'powder_coated';
  }

  return 'other';
}

function toProduct(model?: ProductApiModel | null): Product | undefined {
  if (!model) {
    return undefined;
  }

  return {
    id: model.id,
    sku: model.sku ?? '',
    name: model.name ?? '',
    category: toProductCategory(model.category ?? undefined),
    finish_type: toFinishType(model.finishType ?? undefined),
    length_mm: Number.isFinite(model.lengthMm) ? model.lengthMm ?? null : null,
    unit: model.unit ?? 'unit',
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
  };
}

function toCustomer(model: CustomerApiModel): Customer {
  return {
    id: model.id,
    name: model.name,
    type: toCustomerType(model.type ?? undefined),
    country: model.country ?? '',
    contact_email: model.contactEmail ?? '',
    contact_phone: model.contactPhone ?? null,
    address: model.address ?? null,
    owner_user_id: model.ownerUserId ?? '',
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
    _count: model._count
      ? {
          sales_orders: model._count.salesOrders ?? 0,
        }
      : undefined,
  };
}

function toOrderLine(model: OrderLineApiModel): OrderLine {
  return {
    id: model.id,
    order_id: model.orderId,
    product_id: model.productId,
    qty_ordered: Number.isFinite(model.qtyOrdered) ? model.qtyOrdered : 0,
    qty_dispatched: Number.isFinite(model.qtyDispatched)
      ? model.qtyDispatched ?? 0
      : 0,
    unit_price: Number.isFinite(model.unitPrice) ? model.unitPrice : 0,
    product: toProduct(model.product),
    reserved_item_id: model.reservedItemId ?? null,
  };
}

function toSalesOrder(model: SalesOrderApiModel): SalesOrder {
  const lineCount = model._count?.orderLines ?? model.lineCount;

  return {
    id: model.id,
    customer_id: model.customerId,
    channel: toOrderChannel(model.channel ?? undefined),
    status: toOrderStatus(model.status ?? undefined),
    order_date: model.orderDate ?? '',
    dispatch_date: model.dispatchDate ?? null,
    owner_user_id: model.ownerUserId ?? '',
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
    customer: model.customer ? toCustomer(model.customer) : undefined,
    order_lines: model.orderLines
      ? model.orderLines.map(toOrderLine)
      : undefined,
    owner: model.owner ?? undefined,
    _count:
      lineCount !== undefined && lineCount !== null
        ? {
            order_lines: lineCount,
          }
        : undefined,
  };
}

function toOrderFilters(filters?: OrderFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.status) {
    params.status = filters.status;
  }

  if (filters?.channel) {
    params.channel = filters.channel;
  }

  if (filters?.customer_id) {
    params.customer_id = filters.customer_id;
  }

  if (filters?.from_date) {
    params.start_date = filters.from_date;
  }

  if (filters?.to_date) {
    params.end_date = filters.to_date;
  }

  return params;
}

function toCustomerFilters(filters?: CustomerFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.type) {
    params.type = toApiCustomerType(filters.type);
  }

  if (filters?.country) {
    params.country = filters.country;
  }

  if (filters?.search) {
    params.search = filters.search;
  }

  return params;
}

function toCreateCustomerPayload(dto: CreateCustomerDto) {
  return {
    name: dto.name,
    type: toApiCustomerType(dto.type),
    country: dto.country,
    contactEmail: dto.contact_email,
    contactPhone: dto.contact_phone,
    address: dto.address,
  };
}

function toUpdateCustomerPayload(dto: UpdateCustomerDto) {
  const payload: Record<string, unknown> = {};

  if (dto.name !== undefined) {
    payload.name = dto.name;
  }

  if (dto.type !== undefined) {
    payload.type = toApiCustomerType(dto.type);
  }

  if (dto.country !== undefined) {
    payload.country = dto.country;
  }

  if (dto.contact_email !== undefined) {
    payload.contactEmail = dto.contact_email;
  }

  if (dto.contact_phone !== undefined) {
    payload.contactPhone = dto.contact_phone;
  }

  if (dto.address !== undefined) {
    payload.address = dto.address;
  }

  return payload;
}

function toCreateOrderPayload(dto: CreateOrderDto) {
  return {
    customerId: dto.customer_id,
    channel: dto.channel,
    lines: dto.order_lines.map((line) => ({
      productId: line.product_id,
      qtyOrdered: line.qty_ordered,
      unitPrice: line.unit_price,
    })),
  };
}

function toAddOrderLinePayload(dto: AddOrderLineDto) {
  return {
    productId: dto.product_id,
    qtyOrdered: dto.qty_ordered,
    unitPrice: dto.unit_price,
  };
}

function toUpdateOrderLinePayload(dto: UpdateOrderLineDto) {
  const payload: Record<string, unknown> = {};

  if (dto.qty_ordered !== undefined) {
    payload.quantity = dto.qty_ordered;
  }

  if (dto.unit_price !== undefined) {
    payload.unitPrice = dto.unit_price;
  }

  return payload;
}

function toDispatchPayload(dto: DispatchOrderDto) {
  const payload: Record<string, unknown> = {};

  if (dto.dispatch_date !== undefined) {
    payload.dispatchDate = dto.dispatch_date;
  }

  if (dto.notes !== undefined) {
    payload.notes = dto.notes;
  }

  return payload;
}

function toReturnPayload(dto: ReturnOrderDto) {
  return {
    reason: dto.reason,
    notes: dto.notes,
    lines: dto.lines.map((line) => ({
      lineId: line.line_id,
      qtyReturned: line.qty_returned,
    })),
  };
}

function toDateKey(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function sumOrderValue(order: SalesOrder): number {
  if (!order.order_lines) {
    return 0;
  }

  return order.order_lines.reduce((sum, line) => {
    const lineTotal = line.qty_ordered * line.unit_price;
    return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
  }, 0);
}

export async function getCustomers(
  filters?: CustomerFilters,
): Promise<PaginatedResponse<Customer>> {
  const response = await api.get<ListResponse<CustomerApiModel>>('/customers', {
    params: toCustomerFilters(filters),
  });

  const mappedData = response.data.data.map(toCustomer);
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? Math.max(mappedData.length, 1);
  const total = mappedData.length;

  return {
    success: response.data.success,
    message: response.data.message,
    data: mappedData,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 1 : Math.ceil(total / limit),
    },
  };
}

export async function getCustomerById(
  id: string,
): Promise<Customer & { recent_orders: SalesOrder[] }> {
  const response = await api.get<ApiResponse<CustomerDetailsApiModel>>(
    `/customers/${id}`,
  );
  const customer = toCustomer(response.data.data);
  const ordersResponse = await getOrders({ customer_id: id });

  return {
    ...customer,
    recent_orders: ordersResponse.data,
  };
}

export async function createCustomer(dto: CreateCustomerDto): Promise<Customer> {
  const response = await api.post<ApiResponse<CustomerApiModel>>(
    '/customers',
    toCreateCustomerPayload(dto),
  );
  return toCustomer(response.data.data);
}

export async function updateCustomer(
  id: string,
  dto: UpdateCustomerDto,
): Promise<Customer> {
  const response = await api.put<ApiResponse<CustomerApiModel>>(
    `/customers/${id}`,
    toUpdateCustomerPayload(dto),
  );
  return toCustomer(response.data.data);
}

export async function getOrders(
  filters?: OrderFilters,
): Promise<PaginatedResponse<SalesOrder>> {
  const response = await api.get<ListResponse<SalesOrderApiModel>>('/orders', {
    params: toOrderFilters(filters),
  });

  const mappedData = response.data.data.map(toSalesOrder);
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? Math.max(mappedData.length, 1);
  const total = mappedData.length;

  return {
    success: response.data.success,
    message: response.data.message,
    data: mappedData,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 1 : Math.ceil(total / limit),
    },
  };
}

export async function getOrderById(id: string): Promise<SalesOrder> {
  const response = await api.get<ApiResponse<SalesOrderApiModel>>(`/orders/${id}`);
  return toSalesOrder(response.data.data);
}

export async function createOrder(dto: CreateOrderDto): Promise<SalesOrder> {
  const response = await api.post<ApiResponse<SalesOrderApiModel>>(
    '/orders',
    toCreateOrderPayload(dto),
  );
  return toSalesOrder(response.data.data);
}

export async function dispatchOrder(
  id: string,
  dto: DispatchOrderDto,
): Promise<SalesOrder> {
  const response = await api.put<ApiResponse<SalesOrderApiModel>>(
    `/orders/${id}/dispatch`,
    toDispatchPayload(dto),
  );
  return toSalesOrder(response.data.data);
}

export async function cancelOrder(id: string, reason: string): Promise<SalesOrder> {
  const response = await api.put<ApiResponse<SalesOrderApiModel>>(
    `/orders/${id}/cancel`,
    { reason },
  );
  return toSalesOrder(response.data.data);
}

export async function returnOrder(
  id: string,
  dto: ReturnOrderDto,
): Promise<SalesOrder> {
  const response = await api.post<ApiResponse<SalesOrderApiModel>>(
    `/orders/${id}/return`,
    toReturnPayload(dto),
  );
  return toSalesOrder(response.data.data);
}

export async function addOrderLine(
  orderId: string,
  dto: AddOrderLineDto,
): Promise<OrderLine> {
  const response = await api.post<ApiResponse<OrderLineApiModel>>(
    `/orders/${orderId}/lines`,
    toAddOrderLinePayload(dto),
  );
  return toOrderLine(response.data.data);
}

export async function updateOrderLine(
  lineId: string,
  dto: UpdateOrderLineDto,
): Promise<OrderLine> {
  const response = await api.put<ApiResponse<OrderLineApiModel>>(
    `/lines/${lineId}`,
    toUpdateOrderLinePayload(dto),
  );
  return toOrderLine(response.data.data);
}

export async function deleteOrderLine(lineId: string): Promise<void> {
  await api.delete(`/lines/${lineId}`);
}

export async function getOrderSummaryStats(
  from_date?: string,
  to_date?: string,
): Promise<OrderSummaryStats> {
  const ordersResponse = await getOrders({ from_date, to_date });
  const orders = ordersResponse.data;
  const byChannel = createCountRecord(ORDER_CHANNELS);
  const byStatus = createCountRecord(ORDER_STATUSES);
  const todayKey = new Date().toISOString().slice(0, 10);

  let dispatchedToday = 0;

  for (const order of orders) {
    byChannel[order.channel] += 1;
    byStatus[order.status] += 1;

    const dispatchKey = toDateKey(order.dispatch_date);
    if (dispatchKey && dispatchKey === todayKey) {
      dispatchedToday += 1;
    }
  }

  const orderDetails = await Promise.all(
    orders.map((order) => getOrderById(order.id)),
  );
  const totalValue = orderDetails.reduce(
    (sum, order) => sum + sumOrderValue(order),
    0,
  );

  return {
    totalOrders: orders.length,
    pendingOrders: byStatus.pending,
    dispatchedToday,
    totalValue,
    byChannel,
    byStatus,
  };
}
