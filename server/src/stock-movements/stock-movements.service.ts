import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, StockMovement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementListFilters } from './stock-movements.routes';

const EXPORT_ZONE = 'export';
const EXPORT_ALLOWED_ROLES = new Set<Role>([
  Role.EXPORT_COORDINATOR,
  Role.SYSTEM_ADMIN,
]);

export interface AuthenticatedActor {
  id: string;
  role: Role;
}

export interface CreateManualAdjustmentDto {
  itemId: string;
  quantity: number;
  reason: string;
  movementType?: string;
}

export interface CreateMovementInput {
  itemId: string;
  movementType: string;
  quantity: number;
  performedBy: string;
  reason?: string;
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listStockMovements(
    filters: StockMovementListFilters,
  ): Promise<StockMovement[]> {
    try {
      const where: Prisma.StockMovementWhereInput = {};

      if (filters.movementType) {
        where.movementType = {
          equals: filters.movementType,
          mode: 'insensitive',
        };
      }

      if (filters.itemId) {
        where.itemId = filters.itemId;
      }

      if (filters.performedBy) {
        where.performedBy = filters.performedBy;
      }

      if (filters.startDate || filters.endDate) {
        where.movedAt = {};

        if (filters.startDate) {
          where.movedAt.gte = filters.startDate;
        }

        if (filters.endDate) {
          where.movedAt.lte = filters.endDate;
        }
      }

      return await this.prisma.stockMovement.findMany({
        where,
        orderBy: [{ movedAt: 'desc' }, { id: 'desc' }],
      });
    } catch (error) {
      this.handleError(error, 'Failed to list stock movements');
    }
  }

  async createManualAdjustment(
    body: CreateManualAdjustmentDto,
    actorUserId?: string,
  ): Promise<StockMovement> {
    try {
      if (!body.itemId?.trim()) {
        throw new BadRequestException('itemId is required');
      }

      if (!Number.isFinite(body.quantity) || body.quantity === 0) {
        throw new BadRequestException('quantity must be a non-zero number');
      }

      if (!body.reason?.trim()) {
        throw new BadRequestException('reason is required');
      }

      const actor = await this.requireAuthenticatedActor(actorUserId);

      return await this.prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findUnique({
          where: { id: body.itemId },
        });

        if (!item) {
          throw new NotFoundException(
            `Inventory item with id ${body.itemId} was not found`,
          );
        }

        this.assertExportZoneModificationAllowed(actor.role, item.warehouseZone);

        const nextQuantity = item.quantity + body.quantity;

        if (nextQuantity < 0) {
          throw new BadRequestException(
            'Adjustment would result in negative stock quantity',
          );
        }

        await tx.inventoryItem.update({
          where: { id: body.itemId },
          data: {
            quantity: nextQuantity,
          },
        });

        return await this.createMovementWithinTx(tx, {
          itemId: body.itemId,
          movementType: body.movementType ?? 'MANUAL_ADJUSTMENT',
          quantity: body.quantity,
          performedBy: actor.id,
          reason: body.reason,
        });
      });
    } catch (error) {
      this.handleError(error, 'Failed to create manual stock adjustment');
    }
  }

  async requireAuthenticatedActor(userId?: string): Promise<AuthenticatedActor> {
    if (!userId?.trim()) {
      throw new UnauthorizedException(
        'Authenticated user is required for stock movement operations',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found');
    }

    return user;
  }

  assertExportZoneModificationAllowed(role: Role, zone: string): void {
    if (
      zone.toLowerCase() === EXPORT_ZONE &&
      !EXPORT_ALLOWED_ROLES.has(role)
    ) {
      throw new ForbiddenException(
        'Only export_coordinator or system_admin can modify export stock',
      );
    }
  }

  async createMovementWithinTx(
    client: Prisma.TransactionClient | PrismaService,
    input: CreateMovementInput,
  ): Promise<StockMovement> {
    return await client.stockMovement.create({
      data: {
        itemId: input.itemId,
        movementType: input.movementType,
        quantity: input.quantity,
        performedBy: input.performedBy,
        reason: input.reason,
      },
    });
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
