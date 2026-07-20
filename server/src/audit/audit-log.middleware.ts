import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.middleware';

const GLOBAL_PREFIX = 'api';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The viewer filters on semantic actions, so store those rather than raw verbs.
const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

// Route segment -> the entity name the audit log viewer filters on.
const ENTITY_BY_SEGMENT: Record<string, string> = {
  users: 'User',
  auth: 'User',
  suppliers: 'Supplier',
  'raw-materials': 'RawMaterial',
  dies: 'Die',
  'production-jobs': 'ProductionJob',
  inspections: 'Inspection',
  products: 'Product',
  customers: 'Customer',
  orders: 'SalesOrder',
  returns: 'Return',
  inventory: 'InventoryItem',
  'stock-movements': 'StockMovement',
  stocktake: 'Stocktake',
  'purchase-orders': 'PurchaseOrder',
  'shipping-docs': 'ShippingDoc',
};

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditLogMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const action = ACTION_BY_METHOD[req.method];

    if (!action) {
      next();
      return;
    }

    const startedAt = new Date();

    res.on('finish', () => {
      // Only record attempts the API actually processed.
      if (res.statusCode >= 400) {
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      const segments = this.pathSegments(req.originalUrl);
      const entity = this.extractEntity(segments);
      const entityId = this.extractEntityId(req, segments);
      const ipAddress = this.extractIpAddress(req);

      this.prisma.auditLog
        .create({
          data: {
            userId,
            action,
            entity,
            entityId,
            timestamp: startedAt,
            ipAddress,
          },
        })
        .catch((error: unknown) => {
          // Auditing must never break the request it is recording.
          this.logger.error(
            `Failed to write audit log for ${req.method} ${req.originalUrl}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
    });

    next();
  }

  private pathSegments(url: string): string[] {
    const cleanPath = url.split('?')[0].replace(/^\/+/, '');
    const segments = cleanPath.split('/').filter(Boolean);

    // Requests arrive under the global prefix (`/api/...`); drop it so the
    // entity is read from the resource segment rather than always being "api".
    if (segments[0] === GLOBAL_PREFIX) {
      segments.shift();
    }

    return segments;
  }

  private extractEntity(segments: string[]): string {
    const [segment] = segments;

    if (!segment) {
      return 'unknown';
    }

    return ENTITY_BY_SEGMENT[segment] ?? segment;
  }

  private extractEntityId(req: Request, segments: string[]): string | null {
    // Middleware runs before route matching, so `req.params` is empty here;
    // read the identifier straight out of the path instead.
    const fromPath = segments
      .slice(1)
      .find((segment) => UUID_PATTERN.test(segment));

    if (fromPath) {
      return fromPath;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const candidates = [body?.id, body?.order_id, body?.item_id];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private extractIpAddress(req: Request): string | null {
    const forwardedHeader = req.headers['x-forwarded-for'];

    if (typeof forwardedHeader === 'string' && forwardedHeader.trim()) {
      return forwardedHeader.split(',')[0]?.trim() ?? null;
    }

    if (Array.isArray(forwardedHeader) && forwardedHeader.length > 0) {
      return forwardedHeader[0]?.trim() ?? null;
    }

    return req.ip ?? null;
  }
}
