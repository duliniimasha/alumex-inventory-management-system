import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import { AUDIT_LOGS_ROUTES } from './audit-logs.routes';
import { AuditLogsService, type AuditLogWithUser } from './audit-logs.service';

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

@Controller(AUDIT_LOGS_ROUTES.BASE)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async listAuditLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
  ): Promise<ApiResponse<AuditLogWithUser[]>> {
    try {
      const filters = {
        userId,
        actions: this.parseActionFilter(action),
        entities: this.parseEntityFilter(entity),
        fromDate: this.parseDateFilter(fromDateRaw, 'from_date'),
        toDate: this.parseDateFilter(toDateRaw, 'to_date'),
      };

      if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
        throw new BadRequestException('from_date must be before or equal to to_date');
      }

      const { logs, pagination } = await this.auditLogsService.listAuditLogs(
        page,
        limit,
        filters,
      );

      return {
        success: true,
        data: logs,
        message: 'Audit logs fetched successfully',
        pagination,
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch audit logs');
    }
  }

  private parseActionFilter(value?: string): string[] | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toUpperCase();

    if (!normalized) {
      return undefined;
    }

    if (!ACTION_OPTIONS.includes(normalized as (typeof ACTION_OPTIONS)[number])) {
      throw new BadRequestException(
        `action must be one of: ${ACTION_OPTIONS.join(', ')}`,
      );
    }

    return [normalized];
  }

  private parseEntityFilter(value?: string): string[] | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    return [normalized];
  }

  private parseDateFilter(value: string | undefined, fieldName: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date string`);
    }

    return parsed;
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
