import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import {
  REPORTS_ROUTES,
  SALES_PERIODS,
  type ReportDateRange,
  type SalesPeriod,
} from './reports.routes';
import { ReportsService } from './reports.service';

interface DashboardReportResponse {
  summary: Record<string, unknown>;
  chartData: unknown[];
  tableData: unknown[];
}

@Controller(REPORTS_ROUTES.BASE)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(REPORTS_ROUTES.STOCK_SUMMARY)
  async getStockSummary(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getStockSummary(dateRange, actorUserId);

      return {
        success: true,
        data,
        message: 'Stock summary report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate stock summary report');
    }
  }

  @Get(REPORTS_ROUTES.AGING_STOCK)
  async getAgingStock(
    @Query('days') daysRaw?: string,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const days = this.parseIntegerQuery(daysRaw, 'days', 90, 1);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getAgingStock(
        days,
        dateRange,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Aging stock report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate aging stock report');
    }
  }

  @Get(REPORTS_ROUTES.STOCK_TURNOVER)
  async getStockTurnover(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getStockTurnover(dateRange, actorUserId);

      return {
        success: true,
        data,
        message: 'Stock turnover report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate stock turnover report');
    }
  }

  @Get(REPORTS_ROUTES.PRODUCTION_SUMMARY)
  async getProductionSummary(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getProductionSummary(
        dateRange,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Production summary report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(
        error,
        'Failed to generate production summary report',
      );
    }
  }

  @Get(REPORTS_ROUTES.QC_PASS_RATE)
  async getQcPassRate(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getQcPassRate(dateRange, actorUserId);

      return {
        success: true,
        data,
        message: 'QC pass rate report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate QC pass rate report');
    }
  }

  @Get(REPORTS_ROUTES.SALES_SUMMARY)
  async getSalesSummary(
    @Query('period') periodRaw?: string,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const period = this.parsePeriod(periodRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getSalesSummary(
        period,
        dateRange,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Sales summary report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate sales summary report');
    }
  }

  @Get(REPORTS_ROUTES.TOP_PRODUCTS)
  async getTopProducts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getTopProducts(dateRange, actorUserId);

      return {
        success: true,
        data,
        message: 'Top products report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate top products report');
    }
  }

  @Get(REPORTS_ROUTES.REORDER_ALERTS)
  async getReorderAlerts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getReorderAlerts(
        dateRange,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Reorder alerts report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate reorder alerts report');
    }
  }

  @Get(REPORTS_ROUTES.EXPORT_TRACEABILITY)
  async getExportTraceability(
    @Param('orderId') orderId: string,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<DashboardReportResponse>> {
    try {
      const dateRange = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getExportTraceability(
        orderId,
        dateRange,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Export traceability report generated successfully',
      };
    } catch (error) {
      this.handleControllerError(
        error,
        'Failed to generate export traceability report',
      );
    }
  }

  private parseDateRange(
    fromDateRaw?: string,
    toDateRaw?: string,
  ): ReportDateRange {
    const fromDate = this.parseDateFilter(fromDateRaw, 'from_date');
    const toDate = this.parseDateFilter(toDateRaw, 'to_date');

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('from_date must be before or equal to to_date');
    }

    return {
      fromDate,
      toDate,
    };
  }

  private parseDateFilter(
    value: string | undefined,
    fieldName: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return parsed;
  }

  private parseIntegerQuery(
    value: string | undefined,
    fieldName: string,
    defaultValue: number,
    minValue: number,
  ): number {
    if (value == null || value.trim() === '') {
      return defaultValue;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException(`${fieldName} must be an integer`);
    }

    if (parsed < minValue) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to ${minValue}`,
      );
    }

    return parsed;
  }

  private parsePeriod(value?: string): SalesPeriod {
    if (!value) {
      return 'daily';
    }

    if (!SALES_PERIODS.includes(value as SalesPeriod)) {
      throw new BadRequestException(
        'period must be one of: daily, weekly, monthly',
      );
    }

    return value as SalesPeriod;
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
