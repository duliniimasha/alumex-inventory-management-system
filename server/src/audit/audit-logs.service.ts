import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationMeta } from '../common/api-response.interface';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditLogListFilters } from './audit-logs.routes';

const AUDIT_LOG_SELECT = {
  id: true,
  userId: true,
  action: true,
  entity: true,
  entityId: true,
  ipAddress: true,
  timestamp: true,
  user: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
} satisfies Prisma.AuditLogSelect;

export type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_LOG_SELECT;
}>;

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(
    page = 1,
    limit = 10,
    filters: AuditLogListFilters = {},
  ): Promise<{ logs: AuditLogWithUser[]; pagination: PaginationMeta }> {
    try {
      const safePage = Math.max(page, 1);
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const skip = (safePage - 1) * safeLimit;
      const where: Prisma.AuditLogWhereInput = {};

      if (filters.userId) {
        where.OR = [
          { userId: filters.userId },
          {
            user: {
              name: {
                contains: filters.userId,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      if (filters.actions && filters.actions.length > 0) {
        where.action = { in: filters.actions };
      }

      if (filters.entities && filters.entities.length > 0) {
        where.entity = { in: filters.entities };
      }

      if (filters.fromDate || filters.toDate) {
        where.timestamp = {
          ...(filters.fromDate ? { gte: filters.fromDate } : {}),
          ...(filters.toDate ? { lte: filters.toDate } : {}),
        };
      }

      const [total, logs] = await this.prisma.$transaction([
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { timestamp: 'desc' },
          select: AUDIT_LOG_SELECT,
        }),
      ]);

      return {
        logs,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
        },
      };
    } catch (error) {
      this.handleError(error, 'Failed to list audit logs');
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
