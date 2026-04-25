import {
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  NotImplementedException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import { PURCHASE_ORDERS_ROUTES } from './purchase-orders.routes';

@Controller(PURCHASE_ORDERS_ROUTES.BASE)
export class PurchaseOrdersController {
  @Get()
  async listPurchaseOrders(): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Purchase orders are not implemented yet');
  }

  @Get(PURCHASE_ORDERS_ROUTES.BY_ID)
  async getPurchaseOrderById(
    @Param('id') _id: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Purchase orders are not implemented yet');
  }

  @Post()
  async createPurchaseOrder(): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Purchase orders are not implemented yet');
  }

  @Put(PURCHASE_ORDERS_ROUTES.BY_ID)
  async updatePurchaseOrder(
    @Param('id') _id: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Purchase orders are not implemented yet');
  }

  @Delete(PURCHASE_ORDERS_ROUTES.BY_ID)
  async deletePurchaseOrder(
    @Param('id') _id: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Purchase orders are not implemented yet');
  }
}
