import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { StockMovement } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { STOCK_MOVEMENTS_ROUTES } from './stock-movements.routes';
import { StockMovementsService } from './stock-movements.service';
import type {
  CreateManualAdjustmentDto,
} from './stock-movements.service';

@Controller(STOCK_MOVEMENTS_ROUTES.BASE)
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  async listStockMovements(
    @Query('movement_type') movementType?: string,
    @Query('item_id') itemId?: string,
    @Query('performed_by') performedBy?: string,
    @Query('start_date') startDateRaw?: string,
    @Query('end_date') endDateRaw?: string,
  ): Promise<ApiResponse<StockMovement[]>> {
    try {
      const startDate = this.parseDateFilter(startDateRaw, 'start_date');
      const endDate = this.parseDateFilter(endDateRaw, 'end_date');

      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('start_date must be before end_date');
      }

      const data = await this.stockMovementsService.listStockMovements({
        movementType,
        itemId,
        performedBy,
        startDate,
        endDate,
      });

      return {
        success: true,
        data,
        message: 'Stock movements fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch stock movements');
    }
  }

  @Post()
  async createManualAdjustment(
    @Body() body: CreateManualAdjustmentDto,
    @Req() request: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<StockMovement>> {
    try {
      const actorUserId = request.user?.id ?? userIdHeader;
      const data = await this.stockMovementsService.createManualAdjustment(
        body,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Manual stock adjustment created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create manual stock adjustment');
    }
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

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
