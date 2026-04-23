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
import { Product } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { PRODUCT_CATEGORIES, PRODUCTS_ROUTES } from './products.routes';
import { ProductsService } from './products.service';
import type {
  CreateProductDto,
  ProductWithTotalStock,
  UpdateProductDto,
} from './products.service';
import type { ProductCategory } from './products.routes';

const PRODUCT_CATEGORY_SET = new Set<string>(PRODUCT_CATEGORIES);

@Controller(PRODUCTS_ROUTES.BASE)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async listProducts(
    @Query('category') categoryRaw?: string,
    @Query('finish_type') finishType?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<Product[]>> {
    try {
      const category = categoryRaw
        ? this.parseCategoryFilter(categoryRaw)
        : undefined;

      const data = await this.productsService.listProducts({
        category,
        finishType,
        search,
      });

      return {
        success: true,
        data,
        message: 'Products fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch products');
    }
  }

  @Get(PRODUCTS_ROUTES.BY_ID)
  async getProductById(
    @Param('id') id: string,
  ): Promise<ApiResponse<ProductWithTotalStock>> {
    try {
      const data = await this.productsService.getProductById(id);

      return {
        success: true,
        data,
        message: 'Product fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch product');
    }
  }

  @Post()
  async createProduct(
    @Body() body: CreateProductDto,
  ): Promise<ApiResponse<Product>> {
    try {
      const data = await this.productsService.createProduct(body);

      return {
        success: true,
        data,
        message: 'Product created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create product');
    }
  }

  @Put(PRODUCTS_ROUTES.BY_ID)
  async updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
  ): Promise<ApiResponse<Product>> {
    try {
      const data = await this.productsService.updateProduct(id, body);

      return {
        success: true,
        data,
        message: 'Product updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update product');
    }
  }

  private parseCategoryFilter(value: string): ProductCategory {
    if (!PRODUCT_CATEGORY_SET.has(value)) {
      throw new BadRequestException(
        'category must be one of: Architectural, Household, Hardware, Industrial, Trading',
      );
    }

    return value as ProductCategory;
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
