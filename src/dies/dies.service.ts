import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Die, Prisma } from '@prisma/client';
import { InventoryEventsService } from '../events/inventory-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { DieListFilters } from './dies.routes';

export interface CreateDieDto {
  profileCode: string;
  productCategory: string;
  usageCount?: number;
  maxUsage: number;
  condition: string;
}

export interface UpdateDieDto {
  usageCount?: number;
  condition?: string;
}

@Injectable()
export class DiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryEvents: InventoryEventsService,
  ) {}

  async listDies(filters: DieListFilters): Promise<Die[]> {
    try {
      const where: Prisma.DieWhereInput = { deletedAt: null };

      if (filters.profileCode) {
        where.profileCode = {
          contains: filters.profileCode,
          mode: 'insensitive',
        };
      }

      if (filters.condition) {
        where.condition = {
          equals: filters.condition,
          mode: 'insensitive',
        };
      }

      const dies = await this.prisma.die.findMany({
        where,
        orderBy: { profileCode: 'asc' },
      });

      if (typeof filters.nearMaxUsage === 'boolean') {
        return dies.filter((die) => {
          const isNearMax = die.usageCount >= die.maxUsage * 0.9;
          return filters.nearMaxUsage ? isNearMax : !isNearMax;
        });
      }

      return dies;
    } catch (error) {
      this.handleError(error, 'Failed to list dies');
    }
  }

  async getDieById(id: string): Promise<Die> {
    try {
      const die = await this.prisma.die.findFirst({
        where: { id, deletedAt: null },
      });

      if (!die) {
        throw new NotFoundException(`Die with id ${id} was not found`);
      }

      return die;
    } catch (error) {
      this.handleError(error, 'Failed to get die');
    }
  }

  async createDie(data: CreateDieDto): Promise<Die> {
    try {
      const usageCount = data.usageCount ?? 0;
      const shouldRetire = usageCount >= data.maxUsage;

      const die = await this.prisma.die.create({
        data: {
          ...data,
          usageCount,
          condition: shouldRetire ? 'retired' : data.condition,
        },
      });

      if (shouldRetire) {
        this.inventoryEvents.emitDieRetired({
          dieId: die.id,
          profileCode: die.profileCode,
          usageCount: die.usageCount,
          maxUsage: die.maxUsage,
        });
      }

      return die;
    } catch (error) {
      this.handleError(error, 'Failed to create die');
    }
  }

  async updateDie(id: string, data: UpdateDieDto): Promise<Die> {
    try {
      const existingDie = await this.getDieById(id);
      const nextUsageCount = data.usageCount ?? existingDie.usageCount;
      const shouldRetire = nextUsageCount >= existingDie.maxUsage;
      const nextCondition = shouldRetire
        ? 'retired'
        : data.condition ?? existingDie.condition;

      const die = await this.prisma.die.update({
        where: { id },
        data: {
          usageCount: data.usageCount,
          condition: nextCondition,
        },
      });

      if (shouldRetire && existingDie.condition.toLowerCase() !== 'retired') {
        this.inventoryEvents.emitDieRetired({
          dieId: die.id,
          profileCode: die.profileCode,
          usageCount: die.usageCount,
          maxUsage: die.maxUsage,
        });
      }

      return die;
    } catch (error) {
      this.handleError(error, 'Failed to update die');
    }
  }

  async softDeleteDie(id: string): Promise<Die> {
    try {
      await this.getDieById(id);

      return await this.prisma.die.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'Failed to delete die');
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
