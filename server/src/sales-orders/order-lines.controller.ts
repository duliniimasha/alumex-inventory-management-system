import {
  Body,
  Controller,
  Delete,
  HttpException,
  InternalServerErrorException,
  Param,
  Put,
} from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import { SALES_ORDERS_ROUTES } from './sales-orders.routes';
import { SalesOrdersService } from './sales-orders.service';
import type { OrderLineDetails, UpdateOrderLineDto } from './sales-orders.service';

@Controller()
export class OrderLinesController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Put(SALES_ORDERS_ROUTES.LINE_BY_ID)
  async updateOrderLine(
    @Param('id') id: string,
    @Body()
    body: {
      quantity?: number;
    },
  ): Promise<ApiResponse<OrderLineDetails>> {
    try {
      const payload: UpdateOrderLineDto = {
        quantity: body.quantity ?? Number.NaN,
      };
      const data = await this.salesOrdersService.updateOrderLine(id, payload);

      return {
        success: true,
        data,
        message: 'Order line updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update order line');
    }
  }

  @Delete(SALES_ORDERS_ROUTES.LINE_BY_ID)
  async deleteOrderLine(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ id: string; orderId: string; releasedQuantity: number }>> {
    try {
      const data = await this.salesOrdersService.deleteOrderLine(id);

      return {
        success: true,
        data,
        message: 'Order line deleted successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to delete order line');
    }
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
