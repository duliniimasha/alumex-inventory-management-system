import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { InventoryItem } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { INVENTORY_ROUTES } from './inventory.routes';
import { InventoryService } from './inventory.service';
import type {
  InventoryItemDetails,
  InventoryTransferResult,
  ReceiveInventoryDto,
  TransferInventoryDto,
} from './inventory.service';

@Controller(INVENTORY_ROUTES.BASE)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async listInventory(
    @Query('product_id') productId?: string,
    @Query('warehouse_zone') warehouseZone?: string,
    @Query('location_code') locationCode?: string,
    @Query('received_start_date') receivedStartDateRaw?: string,
    @Query('received_end_date') receivedEndDateRaw?: string,
  ): Promise<ApiResponse<InventoryItem[]>> {
    try {
      const receivedStartDate = this.parseDateFilter(
        receivedStartDateRaw,
        'received_start_date',
      );
      const receivedEndDate = this.parseDateFilter(
        receivedEndDateRaw,
        'received_end_date',
      );

      if (
        receivedStartDate &&
        receivedEndDate &&
        receivedStartDate > receivedEndDate
      ) {
        throw new BadRequestException(
          'received_start_date must be before received_end_date',
        );
      }

      const data = await this.inventoryService.listInventory({
        productId,
        warehouseZone,
        locationCode,
        receivedStartDate,
        receivedEndDate,
      });

      return {
        success: true,
        data,
        message: 'Inventory items fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch inventory items');
    }
  }

  @Get(INVENTORY_ROUTES.BY_ID)
  async getInventoryById(
    @Param('id') id: string,
  ): Promise<ApiResponse<InventoryItemDetails>> {
    try {
      const data = await this.inventoryService.getInventoryById(id);

      return {
        success: true,
        data,
        message: 'Inventory item fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch inventory item');
    }
  }

  @Post(INVENTORY_ROUTES.RECEIVE)
  async receiveInventory(
    @Body() body: ReceiveInventoryDto,
    @Req() request: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<InventoryItemDetails>> {
    try {
      const actorUserId = request.user?.id ?? userIdHeader;
      const data = await this.inventoryService.receiveInventory(body, actorUserId);

      return {
        success: true,
        data,
        message: 'Inventory received successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to receive inventory');
    }
  }

  @Put(INVENTORY_ROUTES.TRANSFER)
  async transferInventory(
    @Param('id') id: string,
    @Body() body: TransferInventoryDto,
    @Req() request: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<InventoryTransferResult>> {
    try {
      const actorUserId = request.user?.id ?? userIdHeader;
      const data = await this.inventoryService.transferInventory(
        id,
        body,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Inventory transferred successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to transfer inventory');
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
