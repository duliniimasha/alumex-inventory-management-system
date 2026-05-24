export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact_email: string;
  certification: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateSupplierDto {
  name: string;
  country: string;
  contact_email: string;
  certification?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>;

export interface SupplierFilters {
  search?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}