import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.middleware';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE']);

@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const startedAt = new Date();

    res.on('finish', () => {
      if (res.statusCode >= 500) {
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;
      const entity = this.extractEntity(req.originalUrl);
      const entityId = this.extractEntityId(req);
      const ipAddress = this.extractIpAddress(req);

      void this.prisma.auditLog.create({
        data: {
          userId,
          action: req.method,
          entity,
          entityId,
          timestamp: startedAt,
          ipAddress,
        },
      });
    });

    next();
  }

  private extractEntity(url: string): string {
    const cleanPath = url.split('?')[0].replace(/^\/+/, '');
    const [segment] = cleanPath.split('/');
    return segment || 'unknown';
  }

  private extractEntityId(req: Request): string | null {
    const candidates = [
      req.params.id,
      req.params.orderId,
      req.params.jobId,
      req.params.itemId,
      req.params.lineId,
      (req.body as { id?: string })?.id,
      (req.body as { order_id?: string })?.order_id,
      (req.body as { item_id?: string })?.item_id,
    ];

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
