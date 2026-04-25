import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  MaterialCategory,
  Prisma,
  RawMaterial,
  Supplier,
} from '@prisma/client';
import { InventoryEventsService } from '../events/inventory-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { RawMaterialListFilters } from './raw-materials.routes';

export interface CreateRawMaterialDto {
  materialCategory?: MaterialCategory;
  materialType: string;
  grade?: string;
  quantityKg: number;
  unit: string;
  reorderLevel: number;
  origin?: string;
  supplierId: string;
}

export interface UpdateRawMaterialDto extends Partial<CreateRawMaterialDto> {}

export type RawMaterialWithSupplier = RawMaterial & {
  supplier: Supplier;
};

@Injectable()
export class RawMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryEvents: InventoryEventsService,
  ) {}

  async listRawMaterials(
    filters: RawMaterialListFilters,
  ): Promise<RawMaterial[]> {
    try {
      const where: Prisma.RawMaterialWhereInput = { deletedAt: null };

      if (filters.materialType) {
        where.materialType = {
          equals: filters.materialType,
          mode: 'insensitive',
        };
      }

      if (filters.grade) {
        where.grade = {
          equals: filters.grade,
          mode: 'insensitive',
        };
      }

      const rawMaterials = await this.prisma.rawMaterial.findMany({
        where,
        orderBy: { materialType: 'asc' },
      });

      if (typeof filters.belowReorderLevel === 'boolean') {
        return rawMaterials.filter((item) =>
          filters.belowReorderLevel
            ? item.quantityKg < item.reorderLevel
            : item.quantityKg >= item.reorderLevel,
        );
      }

      return rawMaterials;
    } catch (error) {
      this.handleError(error, 'Failed to list raw materials');
    }
  }

  async getRawMaterialById(id: string): Promise<RawMaterialWithSupplier> {
    try {
      const rawMaterial = await this.prisma.rawMaterial.findFirst({
        where: { id, deletedAt: null },
        include: { supplier: true },
      });

      if (!rawMaterial) {
        throw new NotFoundException(`Raw material with id ${id} was not found`);
      }

      return rawMaterial;
    } catch (error) {
      this.handleError(error, 'Failed to get raw material');
    }
  }

  async createRawMaterial(data: CreateRawMaterialDto): Promise<RawMaterial> {
    try {
      await this.ensureActiveSupplier(data.supplierId);

      const rawMaterial = await this.prisma.rawMaterial.create({
        data,
      });

      this.emitReorderAlertIfNeeded(rawMaterial);
      return rawMaterial;
    } catch (error) {
      this.handleError(error, 'Failed to create raw material');
    }
  }

  async updateRawMaterial(
    id: string,
    data: UpdateRawMaterialDto,
  ): Promise<RawMaterial> {
    try {
      await this.getRawMaterialById(id);

      if (data.supplierId) {
        await this.ensureActiveSupplier(data.supplierId);
      }

      const rawMaterial = await this.prisma.rawMaterial.update({
        where: { id },
        data,
      });

      this.emitReorderAlertIfNeeded(rawMaterial);
      return rawMaterial;
    } catch (error) {
      this.handleError(error, 'Failed to update raw material');
    }
  }

  async softDeleteRawMaterial(id: string): Promise<RawMaterial> {
    try {
      await this.getRawMaterialById(id);

      return await this.prisma.rawMaterial.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'Failed to delete raw material');
    }
  }

  private async ensureActiveSupplier(id: string): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} was not found`);
    }
  }

  private emitReorderAlertIfNeeded(rawMaterial: RawMaterial): void {
    if (rawMaterial.quantityKg < rawMaterial.reorderLevel) {
      this.inventoryEvents.emitReorderAlert({
        rawMaterialId: rawMaterial.id,
        materialType: rawMaterial.materialType,
        quantityKg: rawMaterial.quantityKg,
        reorderLevel: rawMaterial.reorderLevel,
      });
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
