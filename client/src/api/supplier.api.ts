import api from './axios';
import type {
  CreateSupplierDto,
  PaginatedResponse,
  Supplier,
  SupplierFilters,
  UpdateSupplierDto,
} from '../types/supplier.types';

interface SupplierApiModel {
  id: string;
  name: string;
  country?: string | null;
  contactEmail?: string | null;
  certification?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface SupplierResponse {
  success: boolean;
  message: string;
  data: SupplierApiModel;
}

interface SupplierListResponse {
  success: boolean;
  message: string;
  data: SupplierApiModel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function toSupplier(model: SupplierApiModel): Supplier {
  return {
    id: model.id,
    name: model.name,
    country: model.country ?? '',
    contact_email: model.contactEmail ?? '',
    certification: model.certification ?? null,
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
    deleted_at: model.deletedAt ?? null,
  };
}

function toCreatePayload(dto: CreateSupplierDto) {
  return {
    name: dto.name,
    country: dto.country,
    contactEmail: dto.contact_email,
    certification: dto.certification,
  };
}

function toUpdatePayload(dto: UpdateSupplierDto) {
  const payload: Record<string, unknown> = {};

  if (dto.name !== undefined) {
    payload.name = dto.name;
  }

  if (dto.country !== undefined) {
    payload.country = dto.country;
  }

  if (dto.contact_email !== undefined) {
    payload.contactEmail = dto.contact_email;
  }

  if (dto.certification !== undefined) {
    payload.certification = dto.certification;
  }

  return payload;
}

export async function getSuppliers(
  filters?: SupplierFilters,
): Promise<PaginatedResponse<Supplier>> {
  const response = await api.get<SupplierListResponse>('/suppliers', {
    params: filters,
  });

  return {
    success: response.data.success,
    message: response.data.message,
    data: response.data.data.map(toSupplier),
    pagination: response.data.pagination,
  };
}

export async function getSupplierById(id: string): Promise<Supplier> {
  const response = await api.get<SupplierResponse>(`/suppliers/${id}`);
  return toSupplier(response.data.data);
}

export async function createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
  const response = await api.post<SupplierResponse>('/suppliers', toCreatePayload(dto));
  return toSupplier(response.data.data);
}

export async function updateSupplier(
  id: string,
  dto: UpdateSupplierDto,
): Promise<Supplier> {
  const response = await api.put<SupplierResponse>(`/suppliers/${id}`, toUpdatePayload(dto));
  return toSupplier(response.data.data);
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}