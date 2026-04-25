import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Supplier } from '@prisma/client';
import { PaginationMeta } from '../common/api-response.interface';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateSupplierDto {
  name: string;
  country?: string;
  contactEmail?: string;
  certification?: string;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async listSuppliers(
    page = 1,
    limit = 10,
  ): Promise<{ suppliers: Supplier[]; pagination: PaginationMeta }> {
    try {
      const safePage = Math.max(page, 1);
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const skip = (safePage - 1) * safeLimit;
      const where: Prisma.SupplierWhereInput = { deletedAt: null };

      const [total, suppliers] = await this.prisma.$transaction([
        this.prisma.supplier.count({ where }),
        this.prisma.supplier.findMany({
          where,
          skip,
          take: safeLimit,
          orderBy: { name: 'asc' },
        }),
      ]);

      return {
        suppliers,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
        },
      };
    } catch (error) {
      this.handleError(error, 'Failed to list suppliers');
    }
  }

  async getSupplierById(id: string): Promise<Supplier> {
    try {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id, deletedAt: null },
      });

      if (!supplier) {
        throw new NotFoundException(`Supplier with id ${id} was not found`);
      }

      return supplier;
    } catch (error) {
      this.handleError(error, 'Failed to get supplier');
    }
  }

  async createSupplier(data: CreateSupplierDto): Promise<Supplier> {
    try {
      return await this.prisma.supplier.create({ data });
    } catch (error) {
      this.handleError(error, 'Failed to create supplier');
    }
  }

  async updateSupplier(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    try {
      await this.getSupplierById(id);
      return await this.prisma.supplier.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleError(error, 'Failed to update supplier');
    }
  }

  async softDeleteSupplier(id: string): Promise<Supplier> {
    try {
      await this.getSupplierById(id);
      return await this.prisma.supplier.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'Failed to delete supplier');
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
