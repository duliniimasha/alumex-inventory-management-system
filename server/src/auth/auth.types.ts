import type { Role } from '@prisma/client';
import type { Request } from 'express';
import type { RoleSlug } from './role.util';

export interface JwtClaims {
  user_id: string;
  role: RoleSlug;
  department: string | null;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  user_id: string;
  role: Role;
  role_slug: RoleSlug;
  department: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tokenClaims?: JwtClaims;
}
