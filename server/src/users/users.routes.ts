import type { Role } from '@prisma/client';

export const USERS_ROUTES = {
  BASE: 'users',
  BY_ID: ':id',
  RESET_PASSWORD: ':id/reset-password',
  ACTIVE: ':id/active',
} as const;

export interface UserListFilters {
  role?: Role;
  department?: string;
  isActive?: boolean;
  search?: string;
}
