import api from './axios';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  AdjustStockDto,
  FinishType,
  InventoryFilters,
  InventoryItem,
  MovementType,
  Product,
  ProductCategory,
  ReceiveStockDto,
  StockMovement,
  StockMovementFilters,
  StocktakeEntry,
  StocktakeResult,
  TransferStockDto,
  WarehouseZone,
} from '../types/inventory.types';

interface ProductApiModel {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  finishType?: string | null;
  lengthMm?: number | null;
  unit?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  totalStock?: number | null;
}

interface ProductionJobApiModel {
  id: string;
  processType?: string | null;
  completedAt?: string | null;
}

interface InventoryItemApiModel {
  id: string;
  productId: string;
  jobId?: string | null;
  quantity?: number | null;
  locationCode?: string | null;
  warehouseZone?: string | null;
  receivedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  product?: ProductApiModel | null;
  job?: ProductionJobApiModel | null;
}

interface StockMovementApiModel {
  id: string;
  itemId: string;
  movementType?: string | null;
  quantity?: number | null;
  reason?: string | null;
  performedBy: string;
  movedAt?: string | null;
  inventoryItem?: InventoryItemApiModel | null;
  user?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface InventoryItemDetailsApiModel extends InventoryItemApiModel {
  stockMovements?: StockMovementApiModel[];
}

interface ProductResponse {
  success: boolean;
  message: string;
  data: ProductApiModel;
}

interface ProductListResponse {
  success: boolean;
  message: string;
  data: ProductApiModel[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  total?: number;
}

interface InventoryItemResponse {
  success: boolean;
  message: string;
  data: InventoryItemDetailsApiModel;
}

interface InventoryItemListResponse {
  success: boolean;
  message: string;
  data: InventoryItemApiModel[];
}

interface StockMovementResponse {
  success: boolean;
  message: string;
  data: StockMovementApiModel;
}

interface StockMovementListResponse {
  success: boolean;
  message: string;
  data: StockMovementApiModel[];
}

interface InventoryTransferResult {
  sourceItem: InventoryItemApiModel;
  destinationItem: InventoryItemApiModel;
}

interface InventoryTransferResponse {
  success: boolean;
  message: string;
  data: InventoryTransferResult;
}

interface StocktakeFlaggedItemApi {
  itemId?: string;
  item_id?: string;
  systemQuantity?: number;
  system_quantity?: number;
  countedQuantity?: number;
  counted_quantity?: number;
  variancePercent?: number;
  variance_percent?: number;
  productName?: string;
  product_name?: string;
  locationCode?: string;
  location_code?: string;
}

interface StocktakeSubmitApiResult {
  processedCount?: number;
  discrepancyCount?: number;
  flaggedItemsForReview?: StocktakeFlaggedItemApi[];
}

interface StocktakeResponse {
  success: boolean;
  message: string;
  data: StocktakeSubmitApiResult | StocktakeResult;
}

const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  architectural: 'Architectural',
  household: 'Household',
  hardware: 'Hardware',
  industrial: 'Industrial',
  trading: 'Trading',
};

const FINISH_TYPE_VALUES: Record<FinishType, string> = {
  mill_finish: 'mill_finish',
  powder_coated: 'powder_coated',
  anodized: 'anodized',
  wood_finish: 'wood_finish',
  other: 'other',
};

const WAREHOUSE_ZONE_VALUES: Record<WarehouseZone, WarehouseZone> = {
  main: 'main',
  export: 'export',
  quarantine: 'quarantine',
  dispatch: 'dispatch',
  returns: 'returns',
};

function normalizeKey(value?: string | null): string {
  return value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';
}

function toProductCategory(value?: string | null): ProductCategory {
  const normalized = normalizeKey(value);

  if (normalized in PRODUCT_CATEGORY_LABELS) {
    return normalized as ProductCategory;
  }

  if (normalized === 'architecture') {
    return 'architectural';
  }

  return 'trading';
}

function toApiProductCategory(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeKey(value);

  if (normalized in PRODUCT_CATEGORY_LABELS) {
    return PRODUCT_CATEGORY_LABELS[normalized as ProductCategory];
  }

  return value;
}

function toFinishType(value?: string | null): FinishType {
  const normalized = normalizeKey(value);

  if (normalized in FINISH_TYPE_VALUES) {
    return normalized as FinishType;
  }

  if (normalized === 'powder_coating') {
    return 'powder_coated';
  }

  return 'other';
}

function toApiFinishType(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeKey(value);

  if (normalized in FINISH_TYPE_VALUES) {
    return FINISH_TYPE_VALUES[normalized as FinishType];
  }

  return value;
}

function toWarehouseZone(value?: string | null): WarehouseZone {
  const normalized = normalizeKey(value);

  if (normalized in WAREHOUSE_ZONE_VALUES) {
    return normalized as WarehouseZone;
  }

  return 'main';
}

function toMovementType(value?: string | null): MovementType {
  switch (value?.toUpperCase()) {
    case 'RECEIVE':
      return 'receive';
    case 'DISPATCH':
      return 'dispatch';
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT':
      return 'transfer';
    case 'RETURN':
      return 'return';
    case 'STOCKTAKE_ADJUSTMENT':
      return 'stocktake_correction';
    case 'MANUAL_ADJUSTMENT':
      return 'adjustment';
    default:
      return 'adjustment';
  }
}

function toApiMovementType(value: MovementType, quantity?: number): string {
  switch (value) {
    case 'receive':
      return 'RECEIVE';
    case 'dispatch':
      return 'DISPATCH';
    case 'return':
      return 'RETURN';
    case 'stocktake_correction':
      return 'STOCKTAKE_ADJUSTMENT';
    case 'transfer':
      if (quantity !== undefined && quantity < 0) {
        return 'TRANSFER_OUT';
      }
      return 'TRANSFER_IN';
    case 'adjustment':
    default:
      return 'MANUAL_ADJUSTMENT';
  }
}

function toProduct(model: ProductApiModel): Product {
  return {
    id: model.id,
    sku: model.sku,
    name: model.name,
    category: toProductCategory(model.category ?? undefined),
    finish_type: toFinishType(model.finishType ?? undefined),
    length_mm: Number.isFinite(model.lengthMm) ? model.lengthMm ?? null : null,
    unit: model.unit ?? '',
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
  };
}

function toInventoryItem(model: InventoryItemApiModel): InventoryItem {
  return {
    id: model.id,
    product_id: model.productId,
    job_id: model.jobId ?? null,
    quantity: Number.isFinite(model.quantity) ? model.quantity ?? 0 : 0,
    location_code: model.locationCode ?? '',
    warehouse_zone: toWarehouseZone(model.warehouseZone ?? undefined),
    received_at: model.receivedAt ?? '',
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
    product: model.product ? toProduct(model.product) : undefined,
    production_job: model.job
      ? {
          id: model.job.id,
          process_type: model.job.processType ?? '',
          completed_at: model.job.completedAt ?? null,
        }
      : undefined,
  };
}

function toStockMovement(model: StockMovementApiModel): StockMovement {
  return {
    id: model.id,
    item_id: model.itemId,
    movement_type: toMovementType(model.movementType ?? undefined),
    quantity: Number.isFinite(model.quantity) ? model.quantity ?? 0 : 0,
    reason: model.reason ?? null,
    performed_by: model.performedBy,
    moved_at: model.movedAt ?? '',
    inventory_item: model.inventoryItem ? toInventoryItem(model.inventoryItem) : undefined,
    user: model.user
      ? {
          id: model.user.id,
          name: model.user.name,
          role: model.user.role,
        }
      : undefined,
  };
}

function toProductPayload(dto: Partial<Product>) {
  const payload: Record<string, unknown> = {};

  if (dto.sku !== undefined) {
    payload.sku = dto.sku;
  }

  if (dto.name !== undefined) {
    payload.name = dto.name;
  }

  if (dto.category !== undefined) {
    payload.category = toApiProductCategory(dto.category);
  }

  if (dto.finish_type !== undefined) {
    payload.finishType = toApiFinishType(dto.finish_type);
  }

  if (dto.length_mm !== undefined) {
    payload.lengthMm = dto.length_mm;
  }

  if (dto.unit !== undefined) {
    payload.unit = dto.unit;
  }

  return payload;
}

function toInventoryParams(filters?: InventoryFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.product_id) {
    params.product_id = filters.product_id;
  }

  if (filters?.category) {
    params.category = toApiProductCategory(filters.category);
  }

  if (filters?.warehouse_zone) {
    params.warehouse_zone = filters.warehouse_zone;
  }

  if (filters?.location_code) {
    params.location_code = filters.location_code;
  }

  if (filters?.search) {
    params.search = filters.search;
  }

  if (filters?.low_stock !== undefined) {
    params.low_stock = filters.low_stock;
  }

  if (filters?.from_date) {
    params.received_start_date = filters.from_date;
  }

  if (filters?.to_date) {
    params.received_end_date = filters.to_date;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  return params;
}

function toStockMovementParams(filters?: StockMovementFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.movement_type) {
    params.movement_type = toApiMovementType(filters.movement_type);
  }

  if (filters?.item_id) {
    params.item_id = filters.item_id;
  }

  if (filters?.performed_by) {
    params.performed_by = filters.performed_by;
  }

  if (filters?.from_date) {
    params.start_date = filters.from_date;
  }

  if (filters?.to_date) {
    params.end_date = filters.to_date;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  return params;
}

function toStocktakeResult(data: StocktakeSubmitApiResult | StocktakeResult): StocktakeResult {
  if ('processed' in data) {
    return data;
  }

  const flaggedItems = data.flaggedItemsForReview ?? [];
  const discrepancies = flaggedItems.map((item) => {
    const itemId = item.itemId ?? item.item_id ?? '';
    const systemQuantity = item.systemQuantity ?? item.system_quantity ?? 0;
    const countedQuantity = item.countedQuantity ?? item.counted_quantity ?? 0;
    const variancePercent = item.variancePercent ?? item.variance_percent ?? 0;

    return {
      item_id: itemId,
      system_quantity: systemQuantity,
      counted_quantity: countedQuantity,
      variance: countedQuantity - systemQuantity,
      variance_percent: variancePercent,
      flagged_for_review: true,
      product_name: item.productName ?? item.product_name ?? '',
      location_code: item.locationCode ?? item.location_code ?? '',
    };
  });

  const processed = data.processedCount ?? flaggedItems.length;
  const discrepancyCount = data.discrepancyCount ?? discrepancies.length;
  const noVarianceCount = Math.max(processed - discrepancyCount, 0);

  return {
    processed,
    discrepancies,
    no_variance_count: noVarianceCount,
    flagged_count: discrepancies.length,
  };
}

export async function getProducts(filters?: {
  category?: string;
  search?: string;
  finish_type?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Product>> {
  const params: Record<string, unknown> = {};

  if (filters?.category) {
    params.category = toApiProductCategory(filters.category);
  }

  if (filters?.search) {
    params.search = filters.search;
  }

  if (filters?.finish_type) {
    params.finish_type = filters.finish_type;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  const response = await api.get<ProductListResponse>('/products', { params });
  const mappedData = response.data.data.map(toProduct);
  const responsePagination = response.data.pagination;
  const page = responsePagination?.page ?? filters?.page ?? 1;
  const limit = responsePagination?.limit ?? filters?.limit ?? Math.max(mappedData.length, 1);
  const total = responsePagination?.total ?? response.data.total ?? mappedData.length;
  const totalPages = responsePagination?.totalPages
    ?? (total === 0 ? 1 : Math.ceil(total / Math.max(limit, 1)));

  return {
    success: response.data.success,
    message: response.data.message,
    data: mappedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getProductById(id: string): Promise<Product> {
  const response = await api.get<ProductResponse>(`/products/${id}`);
  return toProduct(response.data.data);
}

export async function createProduct(dto: Partial<Product>): Promise<Product> {
  const response = await api.post<ProductResponse>('/products', toProductPayload(dto));
  return toProduct(response.data.data);
}

export async function updateProduct(id: string, dto: Partial<Product>): Promise<Product> {
  const response = await api.put<ProductResponse>(`/products/${id}`, toProductPayload(dto));
  return toProduct(response.data.data);
}

export async function getInventoryItems(
  filters?: InventoryFilters,
): Promise<PaginatedResponse<InventoryItem>> {
  const response = await api.get<InventoryItemListResponse>('/inventory', {
    params: toInventoryParams(filters),
  });

  const mappedData = response.data.data.map(toInventoryItem);
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

export async function getInventoryItemById(
  id: string,
): Promise<InventoryItem & { movements: StockMovement[] }> {
  const response = await api.get<InventoryItemResponse>(`/inventory/${id}`);
  const item = toInventoryItem(response.data.data);
  const movements = (response.data.data.stockMovements ?? []).map(toStockMovement);

  return {
    ...item,
    movements,
  };
}

export async function receiveStock(dto: ReceiveStockDto): Promise<InventoryItem> {
  const payload = {
    productId: dto.product_id,
    jobId: dto.job_id,
    quantity: dto.quantity,
    locationCode: dto.location_code,
    warehouseZone: dto.warehouse_zone,
  };

  const response = await api.post<InventoryItemResponse>('/inventory/receive', payload);
  return toInventoryItem(response.data.data);
}

export async function transferStock(id: string, dto: TransferStockDto): Promise<InventoryItem> {
  const payload: Record<string, unknown> = {
    locationCode: dto.location_code,
    warehouseZone: dto.warehouse_zone,
  };

  if (dto.reason !== undefined) {
    payload.reason = dto.reason;
  }

  const quantity = (dto as Partial<{ quantity: number }>).quantity;

  if (quantity !== undefined) {
    payload.quantity = quantity;
  }

  const response = await api.put<InventoryTransferResponse>(
    `/inventory/${id}/transfer`,
    payload,
  );

  return toInventoryItem(response.data.data.sourceItem);
}

export async function adjustStock(id: string, dto: AdjustStockDto): Promise<InventoryItem> {
  await api.post<StockMovementResponse>('/stock-movements', {
    itemId: id,
    movementType: toApiMovementType('adjustment', dto.quantity),
    quantity: dto.quantity,
    reason: dto.reason,
  });

  const updated = await getInventoryItemById(id);
  const { movements: _movements, ...item } = updated;
  return item;
}

export async function getStockMovements(
  filters?: StockMovementFilters,
): Promise<PaginatedResponse<StockMovement>> {
  const response = await api.get<StockMovementListResponse>('/stock-movements', {
    params: toStockMovementParams(filters),
  });

  const mappedData = response.data.data.map(toStockMovement);
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

export async function createStockMovement(dto: {
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  reason: string;
}): Promise<StockMovement> {
  const response = await api.post<StockMovementResponse>('/stock-movements', {
    itemId: dto.item_id,
    movementType: toApiMovementType(dto.movement_type, dto.quantity),
    quantity: dto.quantity,
    reason: dto.reason,
  });

  return toStockMovement(response.data.data);
}

export async function submitStocktake(entries: StocktakeEntry[]): Promise<StocktakeResult> {
  const response = await api.post<StocktakeResponse>('/stocktake/submit',
    entries.map((entry) => ({
      item_id: entry.item_id,
      counted_quantity: entry.counted_quantity,
    })),
  );

  return toStocktakeResult(response.data.data);
}
