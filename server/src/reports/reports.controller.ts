import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse } from '../common/api-response.interface';
import { REPORTS_ROUTES, type ReportDateRange } from './reports.routes';
import { ReportsService, type GeneratedWorkbook } from './reports.service';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller(REPORTS_ROUTES.BASE)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(REPORTS_ROUTES.CUSTOMERS_EXPORT)
  async exportCustomers(
    @Res() res: Response,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook = await this.reportsService.exportCustomersWorkbook(
        range,
        actorUserId,
      );
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate customers report');
    }
  }

  @Get(REPORTS_ROUTES.SUPPLIERS_EXPORT)
  async exportSuppliers(
    @Res() res: Response,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook = await this.reportsService.exportSuppliersWorkbook(
        range,
        actorUserId,
      );
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate suppliers report');
    }
  }

  @Get(REPORTS_ROUTES.SALES_EXPORT)
  async exportSales(
    @Res() res: Response,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook = await this.reportsService.exportSalesWorkbook(
        range,
        actorUserId,
      );
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate sales report');
    }
  }

  @Get(REPORTS_ROUTES.INCOME_EXPORT)
  async exportIncome(
    @Res() res: Response,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook = await this.reportsService.exportIncomeWorkbook(
        range,
        actorUserId,
      );
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate income report');
    }
  }

  @Get(REPORTS_ROUTES.TAX_EXPORT)
  async exportTax(
    @Res() res: Response,
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook = await this.reportsService.exportTaxWorkbook(
        range,
        actorUserId,
      );
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate tax report');
    }
  }

  @Get(REPORTS_ROUTES.CUSTOMERS_CHARTS)
  async customersCharts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<unknown>> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getCustomersChartData(
        range,
        actorUserId,
      );
      return { success: true, data, message: 'Customers chart data' };
    } catch (error) {
      this.handleControllerError(error, 'Failed to load customers chart data');
    }
  }

  @Get(REPORTS_ROUTES.SUPPLIERS_CHARTS)
  async suppliersCharts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<unknown>> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getSuppliersChartData(
        range,
        actorUserId,
      );
      return { success: true, data, message: 'Suppliers chart data' };
    } catch (error) {
      this.handleControllerError(error, 'Failed to load suppliers chart data');
    }
  }

  @Get(REPORTS_ROUTES.SALES_CHARTS)
  async salesCharts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<unknown>> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getSalesChartData(
        range,
        actorUserId,
      );
      return { success: true, data, message: 'Sales chart data' };
    } catch (error) {
      this.handleControllerError(error, 'Failed to load sales chart data');
    }
  }

  @Get(REPORTS_ROUTES.INCOME_CHARTS)
  async incomeCharts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<unknown>> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getIncomeChartData(
        range,
        actorUserId,
      );
      return { success: true, data, message: 'Income chart data' };
    } catch (error) {
      this.handleControllerError(error, 'Failed to load income chart data');
    }
  }

  @Get(REPORTS_ROUTES.TAX_CHARTS)
  async taxCharts(
    @Query('from_date') fromDateRaw?: string,
    @Query('to_date') toDateRaw?: string,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<unknown>> {
    try {
      const range = this.parseDateRange(fromDateRaw, toDateRaw);
      const actorUserId = request?.user?.id ?? userIdHeader;
      const data = await this.reportsService.getTaxChartData(range, actorUserId);
      return { success: true, data, message: 'Tax chart data' };
    } catch (error) {
      this.handleControllerError(error, 'Failed to load tax chart data');
    }
  }

  private sendWorkbook(res: Response, workbook: GeneratedWorkbook): void {
    res.set({
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${workbook.filename}"`,
      'Content-Length': workbook.buffer.length,
    });
    res.end(workbook.buffer);
  }

  private parseDateRange(
    fromDateRaw?: string,
    toDateRaw?: string,
  ): ReportDateRange {
    const fromDate = this.parseDateFilter(fromDateRaw, 'from_date', false);
    const toDate = this.parseDateFilter(toDateRaw, 'to_date', true);

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'from_date must be before or equal to to_date',
      );
    }

    return { fromDate, toDate };
  }

  private parseDateFilter(
    value: string | undefined,
    fieldName: string,
    endOfDay: boolean,
  ): Date | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    // For a date-only value (YYYY-MM-DD), include the whole day on the upper bound.
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      parsed.setHours(23, 59, 59, 999);
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
