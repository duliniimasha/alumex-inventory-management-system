export type RoleSlug =
  | 'system_admin'
  | 'management_viewer'
  | 'warehouse_officer'
  | 'procurement_officer'
  | 'production_supervisor'
  | 'qc_inspector'
  | 'sales_executive'
  | 'export_coordinator';

export interface ImsUser {
  id: string;
  name: string;
  email: string;
  role: RoleSlug;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    stock_movements: number;
    audit_logs: number;
  };
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: RoleSlug;
  department?: string;
  is_active?: boolean;
}

export interface UpdateUserDto {
  name?: string;
  role?: RoleSlug;
  department?: string;
  is_active?: boolean;
}

export interface ResetPasswordDto {
  new_password: string;
  confirm_password: string;
}

export interface UserFilters {
  role?: RoleSlug | '';
  department?: string;
  is_active?: boolean | '';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entity_id: string;
  ip_address: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    role: RoleSlug;
  };
}

export interface AuditLogFilters {
  user_id?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE' | '';
  entity?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}
