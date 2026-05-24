import api from './axios';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  AuditLog,
  AuditLogFilters,
  CreateUserDto,
  ImsUser,
  ResetPasswordDto,
  RoleSlug,
  UpdateUserDto,
  UserFilters,
} from '../types/user.types';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ListResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserApiModel {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  _count?: {
    stockMovements?: number;
    stock_movements?: number;
    auditLogs?: number;
    audit_logs?: number;
  };
}

interface AuditLogApiModel {
  id: string;
  userId?: string | null;
  user_id?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId?: string | null;
  entity_id?: string | null;
  ipAddress?: string | null;
  ip_address?: string | null;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    role: string;
  };
}

const ROLE_SLUGS: RoleSlug[] = [
  'system_admin',
  'management_viewer',
  'warehouse_officer',
  'procurement_officer',
  'production_supervisor',
  'qc_inspector',
  'sales_executive',
  'export_coordinator',
];

function toRoleSlug(value: string | undefined): RoleSlug {
  const normalized = value?.toLowerCase() ?? '';
  return (ROLE_SLUGS.includes(normalized as RoleSlug)
    ? (normalized as RoleSlug)
    : 'management_viewer');
}

function toUser(model: UserApiModel): ImsUser {
  const isActive =
    typeof model.isActive === 'boolean'
      ? model.isActive
      : typeof model.is_active === 'boolean'
        ? model.is_active
        : false;

  return {
    id: model.id,
    name: model.name,
    email: model.email,
    role: toRoleSlug(model.role),
    department: model.department ?? null,
    is_active: isActive,
    created_at: model.createdAt ?? model.created_at ?? '',
    updated_at: model.updatedAt ?? model.updated_at ?? '',
    _count: model._count
      ? {
          stock_movements:
            model._count.stockMovements ?? model._count.stock_movements ?? 0,
          audit_logs: model._count.auditLogs ?? model._count.audit_logs ?? 0,
        }
      : undefined,
  };
}

function toAuditLog(model: AuditLogApiModel): AuditLog {
  return {
    id: model.id,
    user_id: model.userId ?? model.user_id ?? '',
    action: model.action,
    entity: model.entity,
    entity_id: model.entityId ?? model.entity_id ?? '',
    ip_address: model.ipAddress ?? model.ip_address ?? '',
    timestamp: model.timestamp,
    user: model.user
      ? {
          id: model.user.id,
          name: model.user.name,
          role: toRoleSlug(model.user.role),
        }
      : undefined,
  };
}

function toUserParams(filters?: UserFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.role) {
    params.role = filters.role;
  }

  if (filters?.department) {
    params.department = filters.department;
  }

  if (filters?.is_active !== undefined && filters?.is_active !== '') {
    params.is_active = filters.is_active;
  }

  if (filters?.search) {
    params.search = filters.search;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  return params;
}

function toAuditLogParams(filters?: AuditLogFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.user_id) {
    params.user_id = filters.user_id;
  }

  if (filters?.action) {
    params.action = filters.action;
  }

  if (filters?.entity) {
    params.entity = filters.entity;
  }

  if (filters?.from_date) {
    params.from_date = filters.from_date;
  }

  if (filters?.to_date) {
    params.to_date = filters.to_date;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  return params;
}

export async function getUsers(filters?: UserFilters): Promise<PaginatedResponse<ImsUser>> {
  const response = await api.get<ListResponse<UserApiModel>>('/users', {
    params: toUserParams(filters),
  });

  const data = (response.data.data ?? []).map(toUser);
  const page = response.data.pagination?.page ?? filters?.page ?? 1;
  const limit = response.data.pagination?.limit ?? filters?.limit ?? Math.max(data.length, 1);
  const total = response.data.pagination?.total ?? data.length;

  return {
    success: response.data.success,
    message: response.data.message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages:
        response.data.pagination?.totalPages ?? (total === 0 ? 1 : Math.ceil(total / limit)),
    },
  };
}

export async function getUserById(id: string): Promise<ImsUser> {
  const response = await api.get<ApiResponse<UserApiModel>>(`/users/${id}`);
  return toUser(response.data.data);
}

export async function createUser(dto: CreateUserDto): Promise<ImsUser> {
  const response = await api.post<ApiResponse<UserApiModel>>('/auth/register', dto);
  return toUser(response.data.data);
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<ImsUser> {
  const response = await api.put<ApiResponse<UserApiModel>>(`/users/${id}`, dto);
  return toUser(response.data.data);
}

export async function resetUserPassword(
  id: string,
  dto: ResetPasswordDto,
): Promise<{ success: boolean }> {
  const response = await api.post<ApiResponse<{ success: boolean }>>(
    `/users/${id}/reset-password`,
    dto,
  );
  return response.data.data;
}

export async function toggleUserActive(
  id: string,
  is_active: boolean,
): Promise<ImsUser> {
  const response = await api.patch<ApiResponse<UserApiModel>>(`/users/${id}/active`, {
    is_active,
  });
  return toUser(response.data.data);
}

export async function getAuditLogs(
  filters?: AuditLogFilters,
): Promise<PaginatedResponse<AuditLog>> {
  const response = await api.get<ListResponse<AuditLogApiModel>>('/audit-logs', {
    params: toAuditLogParams(filters),
  });

  const data = (response.data.data ?? []).map(toAuditLog);
  const page = response.data.pagination?.page ?? filters?.page ?? 1;
  const limit = response.data.pagination?.limit ?? filters?.limit ?? Math.max(data.length, 1);
  const total = response.data.pagination?.total ?? data.length;

  return {
    success: response.data.success,
    message: response.data.message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages:
        response.data.pagination?.totalPages ?? (total === 0 ? 1 : Math.ceil(total / limit)),
    },
  };
}
