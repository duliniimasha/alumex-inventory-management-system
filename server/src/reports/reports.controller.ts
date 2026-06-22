import {
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { REPORTS_ROUTES } from './reports.routes';
import { ReportsService, type GeneratedWorkbook } from './reports.service';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller(REPORTS_ROUTES.BASE)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(REPORTS_ROUTES.CUSTOMERS_EXPORT)
  async exportCustomers(
    @Res() res: Response,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook =
        await this.reportsService.exportCustomersWorkbook(actorUserId);
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate customers report');
    }
  }

  @Get(REPORTS_ROUTES.SUPPLIERS_EXPORT)
  async exportSuppliers(
    @Res() res: Response,
    @Req() request?: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<void> {
    try {
      const actorUserId = request?.user?.id ?? userIdHeader;
      const workbook =
        await this.reportsService.exportSuppliersWorkbook(actorUserId);
      this.sendWorkbook(res, workbook);
    } catch (error) {
      this.handleControllerError(error, 'Failed to generate suppliers report');
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

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
