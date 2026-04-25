import { Injectable, type NestMiddleware } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import jwt, {
  JsonWebTokenError,
  TokenExpiredError,
  type JwtPayload,
} from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { sendStandardError } from '../common/error-response.util';
import { roleSlugToEnum, type RoleSlug } from './role.util';

interface AuthTokenPayload extends JwtPayload {
  user_id: string;
  role: RoleSlug;
  department: string | null;
  jti: string;
}

interface RequestUser {
  id: string;
  user_id: string;
  role: Role;
  role_slug: RoleSlug;
  department: string | null;
}

export type AuthenticatedRequest = Request & {
  user?: RequestUser;
  tokenPayload?: AuthTokenPayload;
};

interface AuthorizeOwnOptions {
  resource: 'customer' | 'order' | 'order-line';
  idParam?: string;
  applyOwnerFilterOnList?: boolean;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }

  return secret;
}

function extractBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function normalizePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
}

function isPublicPath(req: Request): boolean {
  const path = normalizePath(req.path);

  if (req.method === 'OPTIONS') {
    return true;
  }

  if (req.method === 'GET' && path === '') {
    return true;
  }

  if (req.method === 'POST' && path === 'auth/login') {
    return true;
  }

  return false;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getRequestZoneValues(req: Request): string[] {
  const body = req.body as Record<string, unknown> | undefined;
  const values: unknown[] = [
    req.query.warehouse_zone,
    body?.warehouse_zone,
    body?.warehouseZone,
  ];

  return values
    .flat()
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);
}

@Injectable()
export class AuthenticateMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (isPublicPath(req)) {
      next();
      return;
    }

    const token = extractBearerToken(req);

    if (!token) {
      sendStandardError(res, 401, 'Authorization bearer token is required');
      return;
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;

      if (
        !decoded ||
        typeof decoded.user_id !== 'string' ||
        typeof decoded.role !== 'string' ||
        typeof decoded.jti !== 'string'
      ) {
        sendStandardError(res, 401, 'Invalid token payload');
        return;
      }

      const role = roleSlugToEnum(decoded.role);
      const revokedToken = await this.prisma.revokedToken.findUnique({
        where: { jti: decoded.jti },
        select: { id: true },
      });

      if (revokedToken) {
        sendStandardError(res, 401, 'Token has been invalidated');
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.user_id },
        select: {
          id: true,
          role: true,
          department: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        sendStandardError(res, 401, 'Authenticated user is inactive or missing');
        return;
      }

      if (user.role !== role) {
        sendStandardError(res, 401, 'Token role does not match current user role');
        return;
      }

      if (user.role === Role.MANAGEMENT_VIEWER && req.method !== 'GET') {
        sendStandardError(
          res,
          403,
          'management_viewer has GET-only access to protected endpoints',
        );
        return;
      }

      (req as AuthenticatedRequest).user = {
        id: user.id,
        user_id: user.id,
        role: user.role,
        role_slug: decoded.role,
        department: user.department ?? null,
      };
      (req as AuthenticatedRequest).tokenPayload = decoded;

      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        sendStandardError(res, 401, 'Token has expired');
        return;
      }

      if (error instanceof JsonWebTokenError) {
        sendStandardError(res, 401, 'Invalid token');
        return;
      }

      sendStandardError(res, 500, 'Failed to authenticate request');
    }
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendStandardError(res, 401, 'Authentication required');
      return;
    }

    if (user.role === Role.SYSTEM_ADMIN) {
      next();
      return;
    }

    if (user.role === Role.MANAGEMENT_VIEWER) {
      if (req.method === 'GET') {
        next();
        return;
      }

      sendStandardError(
        res,
        403,
        'management_viewer has GET-only access to protected endpoints',
      );
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      sendStandardError(res, 403, 'You do not have permission to access this route');
      return;
    }

    next();
  };
}

export function authorizeOwn(
  prisma: PrismaService,
  options: AuthorizeOwnOptions,
) {
  const idParam = options.idParam ?? 'id';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendStandardError(res, 401, 'Authentication required');
      return;
    }

    if (user.role !== Role.SALES_EXECUTIVE) {
      next();
      return;
    }

    const targetId = firstParam(req.params[idParam]);

    if (!targetId && options.applyOwnerFilterOnList && req.method === 'GET') {
      req.query.owner_user_id = user.id;
      next();
      return;
    }

    if (!targetId || req.method === 'POST') {
      next();
      return;
    }

    try {
      let ownerUserId: string | null = null;
      let exists = true;

      if (options.resource === 'customer') {
        const customer = await prisma.customer.findUnique({
          where: { id: targetId },
          select: { ownerUserId: true },
        });
        exists = !!customer;
        ownerUserId = customer?.ownerUserId ?? null;
      } else if (options.resource === 'order') {
        const order = await prisma.salesOrder.findUnique({
          where: { id: targetId },
          select: { ownerUserId: true },
        });
        exists = !!order;
        ownerUserId = order?.ownerUserId ?? null;
      } else {
        const line = await prisma.orderLine.findUnique({
          where: { id: targetId },
          select: { orderId: true },
        });

        if (!line) {
          exists = false;
        } else {
          const order = await prisma.salesOrder.findUnique({
            where: { id: line.orderId },
            select: { ownerUserId: true },
          });
          ownerUserId = order?.ownerUserId ?? null;
        }
      }

      if (!exists) {
        sendStandardError(res, 404, 'Resource was not found');
        return;
      }

      if (!ownerUserId || ownerUserId !== user.id) {
        sendStandardError(res, 403, 'You can only access your own records');
        return;
      }

      next();
    } catch {
      sendStandardError(res, 500, 'Failed to validate ownership');
    }
  };
}

export function enforceExportInventoryWrite(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const role = (req as AuthenticatedRequest).user?.role;

  if (!role) {
    sendStandardError(res, 401, 'Authentication required');
    return;
  }

  if (
    getRequestZoneValues(req).includes('export') &&
    role !== Role.SYSTEM_ADMIN &&
    role !== Role.EXPORT_COORDINATOR
  ) {
    sendStandardError(
      res,
      403,
      'Only export_coordinator and system_admin can write to export inventory zone',
    );
    return;
  }

  next();
}

export function enforceProductionRawMaterialQtyEdit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const role = (req as AuthenticatedRequest).user?.role;

  if (role !== Role.PRODUCTION_SUPERVISOR) {
    next();
    return;
  }

  const body = req.body as Record<string, unknown>;
  const allowedKeys = new Set(['quantityKg', 'quantity_kg']);

  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      sendStandardError(
        res,
        403,
        'production_supervisor can only edit raw material quantity fields',
      );
      return;
    }
  }

  next();
}

export function enforceExportOrderScope(prisma: PrismaService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      sendStandardError(res, 401, 'Authentication required');
      return;
    }

    if (user.role !== Role.EXPORT_COORDINATOR) {
      next();
      return;
    }

    try {
      if (req.method === 'GET' && !firstParam(req.params.id) && !firstParam(req.params.orderId)) {
        req.query.channel = 'export';
        next();
        return;
      }

      if (req.method === 'POST' && req.path === '/orders') {
        const body = req.body as Record<string, unknown>;
        const channel = String(body.channel ?? '').toLowerCase();

        if (channel !== 'export') {
          sendStandardError(
            res,
            403,
            'export_coordinator can only create orders in export channel',
          );
          return;
        }

        next();
        return;
      }

      const orderId = firstParam(req.params.id ?? req.params.orderId);

      if (orderId) {
        if (req.path.includes('/orders/lines/')) {
          const line = await prisma.orderLine.findUnique({
            where: { id: orderId },
            select: { orderId: true },
          });

          if (!line) {
            sendStandardError(res, 404, 'Order line was not found');
            return;
          }

          const order = await prisma.salesOrder.findUnique({
            where: { id: line.orderId },
            select: { channel: true },
          });

          if ((order?.channel ?? '').toLowerCase() !== 'export') {
            sendStandardError(
              res,
              403,
              'export_coordinator can only access export channel orders',
            );
            return;
          }

          next();
          return;
        }

        const order = await prisma.salesOrder.findUnique({
          where: { id: orderId },
          select: { channel: true },
        });

        if (!order) {
          sendStandardError(res, 404, 'Order was not found');
          return;
        }

        if ((order.channel ?? '').toLowerCase() !== 'export') {
          sendStandardError(
            res,
            403,
            'export_coordinator can only access export channel orders',
          );
          return;
        }
      }

      next();
    } catch {
      sendStandardError(res, 500, 'Failed to enforce export order scope');
    }
  };
}
