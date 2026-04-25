import { Controller, Get, NotImplementedException, Param, Post } from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import { RETURNS_ROUTES } from './returns.routes';

@Controller(RETURNS_ROUTES.BASE)
export class ReturnsController {
  @Post(RETURNS_ROUTES.BY_ORDER_ID)
  async createReturnRequest(
    @Param('orderId') _orderId: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('RMA returns are not implemented yet');
  }

  @Get(RETURNS_ROUTES.BY_ORDER_ID)
  async getReturnRequest(
    @Param('orderId') _orderId: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('RMA returns are not implemented yet');
  }
}
