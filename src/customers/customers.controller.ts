import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Customer } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import {
  CUSTOMERS_ROUTES,
  CUSTOMER_TYPES,
  type CustomerType,
} from './customers.routes';
import { CustomersService } from './customers.service';
import type {
  CreateCustomerDto,
  CustomerWithOrderHistorySummary,
  UpdateCustomerDto,
} from './customers.service';

const CUSTOMER_TYPE_SET = new Set<string>(CUSTOMER_TYPES);

@Controller(CUSTOMERS_ROUTES.BASE)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async listCustomers(
    @Query('type') typeRaw?: string,
    @Query('country') country?: string,
  ): Promise<ApiResponse<Customer[]>> {
    try {
      const type = typeRaw ? this.parseTypeFilter(typeRaw) : undefined;
      const data = await this.customersService.listCustomers({
        type,
        country,
      });

      return {
        success: true,
        data,
        message: 'Customers fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch customers');
    }
  }

  @Get(CUSTOMERS_ROUTES.BY_ID)
  async getCustomerById(
    @Param('id') id: string,
  ): Promise<ApiResponse<CustomerWithOrderHistorySummary>> {
    try {
      const data = await this.customersService.getCustomerWithOrderHistorySummary(
        id,
      );

      return {
        success: true,
        data,
        message: 'Customer fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch customer');
    }
  }

  @Post()
  async createCustomer(
    @Body() body: CreateCustomerDto,
  ): Promise<ApiResponse<Customer>> {
    try {
      const data = await this.customersService.createCustomer(body);

      return {
        success: true,
        data,
        message: 'Customer created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create customer');
    }
  }

  @Put(CUSTOMERS_ROUTES.BY_ID)
  async updateCustomer(
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ): Promise<ApiResponse<Customer>> {
    try {
      const data = await this.customersService.updateCustomer(id, body);

      return {
        success: true,
        data,
        message: 'Customer updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update customer');
    }
  }

  private parseTypeFilter(value: string): CustomerType {
    if (!CUSTOMER_TYPE_SET.has(value)) {
      throw new BadRequestException(
        'type must be one of: B2B, fabricator, export, retail',
      );
    }

    return value as CustomerType;
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
