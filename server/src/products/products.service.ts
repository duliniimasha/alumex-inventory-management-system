import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductListFilters,
} from './products.routes';

const PRODUCT_CATEGORY_SET = new Set<string>(PRODUCT_CATEGORIES);

export interface CreateProductDto {
  sku: string;
  name: string;
  category: ProductCategory;
  finishType: string;
  lengthMm: number;
  unit: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export type ProductWithTotalStock = Product & {
  totalStock: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(filters: ProductListFilters): Promise<Product[]> {
    try {
      const where: Prisma.ProductWhereInput = {};
      const andConditions: Prisma.ProductWhereInput[] = [];

      if (filters.category) {
        andConditions.push({
          category: filters.category,
        });
      }

      if (filters.finishType) {
        andConditions.push({
          finishType: {
            equals: filters.finishType,
            mode: 'insensitive',
          },
        });
      }

      if (filters.search) {
        andConditions.push({
          OR: [
            {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
            {
              sku: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          ],
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      return await this.prisma.product.findMany({
        where,
        orderBy: [{ name: 'asc' }, { sku: 'asc' }],
      });
    } catch (error) {
      this.handleError(error, 'Failed to list products');
    }
  }

  async getProductById(id: string): Promise<ProductWithTotalStock> {
    try {
      const [product, totalStockAggregate] = await this.prisma.$transaction([
        this.prisma.product.findUnique({
          where: { id },
        }),
        this.prisma.inventoryItem.aggregate({
          where: { productId: id },
          _sum: {
            quantity: true,
          },
        }),
      ]);

      if (!product) {
        throw new NotFoundException(`Product with id ${id} was not found`);
      }

      return {
        ...product,
        totalStock: totalStockAggregate._sum.quantity ?? 0,
      };
    } catch (error) {
      this.handleError(error, 'Failed to get product');
    }
  }

  async createProduct(body: CreateProductDto): Promise<Product> {
    try {
      this.validateProductCategory(body.category);

      return await this.prisma.product.create({
        data: {
          sku: body.sku,
          name: body.name,
          category: body.category,
          finishType: body.finishType,
          lengthMm: body.lengthMm,
          unit: body.unit,
        },
      });
    } catch (error) {
      this.handleError(error, 'Failed to create product');
    }
  }

  async updateProduct(id: string, body: UpdateProductDto): Promise<Product> {
    try {
      await this.ensureProductExists(id);

      if (body.category) {
        this.validateProductCategory(body.category);
      }

      return await this.prisma.product.update({
        where: { id },
        data: body,
      });
    } catch (error) {
      this.handleError(error, 'Failed to update product');
    }
  }

  private async ensureProductExists(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} was not found`);
    }
  }

  private validateProductCategory(value: string): void {
    if (!PRODUCT_CATEGORY_SET.has(value)) {
      throw new BadRequestException(
        'category must be one of: Architectural, Household, Hardware, Industrial, Trading',
      );
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
