import api from './axios';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  CreateRawMaterialDto,
  RawMaterial,
  RawMaterialFilters,
  UpdateRawMaterialDto,
} from '../types/rawMaterial.types';

interface RawMaterialApiSupplier {
  id: string;
  name: string;
  country?: string | null;
  contactEmail?: string | null;
}

interface RawMaterialApiModel {
  id: string;
  materialType?: string;
  grade?: string | null;
  quantityKg?: number;
  unit?: string;
  reorderLevel?: number;
  supplierId?: string;
  supplier?: RawMaterialApiSupplier;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface RawMaterialResponse {
  success: boolean;
  message: string;
  data: RawMaterialApiModel;
}

interface RawMaterialListResponse {
  success: boolean;
  message: string;
  data: RawMaterialApiModel[];
}

function mapMaterialType(rawType: string | undefined): RawMaterial['material_type'] {
  switch (rawType) {
    case 'billet':
    case 'chemical':
    case 'die':
    case 'traded_good':
    case 'other':
      return rawType;
    default:
      return 'other';
  }
}

function toRawMaterial(model: RawMaterialApiModel): RawMaterial {
  return {
    id: model.id,
    material_type: mapMaterialType(model.materialType),
    grade: model.grade ?? null,
    quantity_kg: Number.isFinite(model.quantityKg) ? model.quantityKg : 0,
    unit: model.unit ?? 'kg',
    reorder_level: Number.isFinite(model.reorderLevel) ? model.reorderLevel : 0,
    supplier_id: model.supplierId ?? '',
    supplier: model.supplier
      ? {
          id: model.supplier.id,
          name: model.supplier.name,
          country: model.supplier.country ?? '—',
          contact_email: model.supplier.contactEmail ?? null,
        }
      : undefined,
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
    deleted_at: model.deletedAt ?? null,
  };
}

function toCreatePayload(dto: CreateRawMaterialDto) {
  return {
    materialType: dto.material_type,
    grade: dto.grade,
    quantityKg: dto.quantity_kg,
    unit: dto.unit,
    reorderLevel: dto.reorder_level,
    supplierId: dto.supplier_id,
  };
}

function toUpdatePayload(dto: UpdateRawMaterialDto) {
  const payload: Record<string, unknown> = {};

  if (dto.material_type !== undefined) {
    payload.materialType = dto.material_type;
  }

  if (dto.grade !== undefined) {
    payload.grade = dto.grade;
  }

  if (dto.quantity_kg !== undefined) {
    payload.quantityKg = dto.quantity_kg;
  }

  if (dto.unit !== undefined) {
    payload.unit = dto.unit;
  }

  if (dto.reorder_level !== undefined) {
    payload.reorderLevel = dto.reorder_level;
  }

  if (dto.supplier_id !== undefined) {
    payload.supplierId = dto.supplier_id;
  }

  return payload;
}

export async function getRawMaterials(
  filters?: RawMaterialFilters,
): Promise<PaginatedResponse<RawMaterial>> {
  const response = await api.get<RawMaterialListResponse>('/raw-materials', {
    params: filters,
  });

  const mappedData = response.data.data.map(toRawMaterial);
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

export async function getRawMaterialById(id: string): Promise<RawMaterial> {
  const response = await api.get<RawMaterialResponse>(`/raw-materials/${id}`);
  return toRawMaterial(response.data.data);
}

export async function createRawMaterial(dto: CreateRawMaterialDto): Promise<RawMaterial> {
  const response = await api.post<RawMaterialResponse>('/raw-materials', toCreatePayload(dto));
  return toRawMaterial(response.data.data);
}

export async function updateRawMaterial(
  id: string,
  dto: UpdateRawMaterialDto,
): Promise<RawMaterial> {
  const response = await api.put<RawMaterialResponse>(`/raw-materials/${id}`, toUpdatePayload(dto));
  return toRawMaterial(response.data.data);
}

export async function deleteRawMaterial(id: string): Promise<void> {
  await api.delete(`/raw-materials/${id}`);
}