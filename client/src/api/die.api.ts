import api from './axios';
import type { PaginatedResponse } from '../types/supplier.types';
import type { Die, DieFilters } from '../types/die.types';

interface DieApiModel {
  id: string;
  profileCode: string;
  productCategory: string;
  usageCount: number;
  maxUsage: number;
  condition: string;
  deletedAt?: string | null;
}

interface DieListResponse {
  success: boolean;
  message: string;
  data: DieApiModel[];
}

function toDie(model: DieApiModel): Die {
  return {
    id: model.id,
    profile_code: model.profileCode,
    product_category: model.productCategory,
    usage_count: model.usageCount,
    max_usage: model.maxUsage,
    condition: model.condition,
    deleted_at: model.deletedAt ?? null,
  };
}

function toListParams(filters?: DieFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.profile_code) {
    params.profile_code = filters.profile_code;
  }

  if (filters?.condition) {
    params.condition = filters.condition;
  }

  if (filters?.near_max_usage !== undefined) {
    params.near_max_usage = filters.near_max_usage;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  return params;
}

export async function getDies(filters?: DieFilters): Promise<PaginatedResponse<Die>> {
  const response = await api.get<DieListResponse>('/dies', {
    params: toListParams(filters),
  });

  const mappedData = response.data.data.map(toDie);
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
