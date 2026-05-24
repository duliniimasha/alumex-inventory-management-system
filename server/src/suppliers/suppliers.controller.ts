import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Supplier } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { SuppliersService } from './suppliers.service';
import type {
  CreateSupplierDto,
  UpdateSupplierDto,
} from './suppliers.service';
import { SUPPLIERS_ROUTES, type SupplierListFilters } from './suppliers.routes';

@Controller(SUPPLIERS_ROUTES.BASE)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async listSuppliers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('country') country?: string,
  ): Promise<ApiResponse<Supplier[]>> {
    try {
      const filters: SupplierListFilters = {
        search,
        country,
      };

      const { suppliers, pagination } = await this.suppliersService.listSuppliers(
        page,
        limit,
        filters,
      );

      return {
        success: true,
        data: suppliers,
        message: 'Suppliers fetched successfully',
        pagination,
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch suppliers');
    }
  }

  @Get(SUPPLIERS_ROUTES.BY_ID)
  async getSupplierById(@Param('id') id: string): Promise<ApiResponse<Supplier>> {
    try {
      const supplier = await this.suppliersService.getSupplierById(id);
      return {
        success: true,
        data: supplier,
        message: 'Supplier fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch supplier');
    }
  }

  @Post()
  async createSupplier(
    @Body() body: CreateSupplierDto,
  ): Promise<ApiResponse<Supplier>> {
    try {
      const supplier = await this.suppliersService.createSupplier(body);
      return {
        success: true,
        data: supplier,
        message: 'Supplier created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create supplier');
    }
  }

  @Put(SUPPLIERS_ROUTES.BY_ID)
  async updateSupplier(
    @Param('id') id: string,
    @Body() body: UpdateSupplierDto,
  ): Promise<ApiResponse<Supplier>> {
    try {
      const supplier = await this.suppliersService.updateSupplier(id, body);
      return {
        success: true,
        data: supplier,
        message: 'Supplier updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update supplier');
    }
  }

  @Delete(SUPPLIERS_ROUTES.BY_ID)
  async deleteSupplier(@Param('id') id: string): Promise<ApiResponse<Supplier>> {
    try {
      const supplier = await this.suppliersService.softDeleteSupplier(id);
      return {
        success: true,
        data: supplier,
        message: 'Supplier deleted successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to delete supplier');
    }
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
