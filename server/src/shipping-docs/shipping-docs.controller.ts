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
import { SHIPPING_DOCS_ROUTES } from './shipping-docs.routes';

@Controller(SHIPPING_DOCS_ROUTES.BASE)
export class ShippingDocsController {
  @Get()
  async listShippingDocs(): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Shipping documents are not implemented yet');
  }

  @Get(SHIPPING_DOCS_ROUTES.BY_ID)
  async getShippingDocById(
    @Param('id') _id: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Shipping documents are not implemented yet');
  }

  @Post()
  async createShippingDoc(): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Shipping documents are not implemented yet');
  }

  @Put(SHIPPING_DOCS_ROUTES.BY_ID)
  async updateShippingDoc(
    @Param('id') _id: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Shipping documents are not implemented yet');
  }

  @Delete(SHIPPING_DOCS_ROUTES.BY_ID)
  async deleteShippingDoc(
    @Param('id') _id: string,
  ): Promise<ApiResponse<never>> {
    throw new NotImplementedException('Shipping documents are not implemented yet');
  }
}
