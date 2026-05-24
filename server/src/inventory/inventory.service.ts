import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryItem,
  Prisma,
  Product,
  ProductionJob,
  StockMovement,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { InventoryListFilters } from './inventory.routes';

export interface ReceiveInventoryDto {
  productId: string;
  quantity: number;
  warehouseZone: string;
  locationCode: string;
  receivedAt?: string | Date;
  jobId?: string;
}

export interface TransferInventoryDto {
  quantity: number;
  warehouseZone: string;
  locationCode: string;
  reason?: string;
}

export type InventoryItemDetails = InventoryItem & {
  product: Product;
  job: ProductionJob | null;
  stockMovements: (StockMovement & {
    user: {
      id: string;
      name: string;
      role: string;
    };
  })[];
};

export interface InventoryTransferResult {
  sourceItem: InventoryItem;
  destinationItem: InventoryItem;
}

export type InventoryListItem = InventoryItem & {
  product: Product;
  job: ProductionJob | null;
};

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async listInventory(filters: InventoryListFilters): Promise<InventoryListItem[]> {
    try {
      const where: Prisma.InventoryItemWhereInput = {};

      if (filters.productId) {
        where.productId = filters.productId;
      }

      if (filters.warehouseZone) {
        where.warehouseZone = {
          equals: filters.warehouseZone,
          mode: 'insensitive',
        };
      }

      if (filters.locationCode) {
        where.locationCode = {
          equals: filters.locationCode,
          mode: 'insensitive',
        };
      }

      if (filters.receivedStartDate || filters.receivedEndDate) {
        where.receivedAt = {};

        if (filters.receivedStartDate) {
          where.receivedAt.gte = filters.receivedStartDate;
        }

        if (filters.receivedEndDate) {
          where.receivedAt.lte = filters.receivedEndDate;
        }
      }

      return await this.prisma.inventoryItem.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        include: {
          product: true,
          job: true,
        },
      });
    } catch (error) {
      this.handleError(error, 'Failed to list inventory items');
    }
  }

  async getInventoryById(id: string): Promise<InventoryItemDetails> {
    try {
      return await this.getInventoryByIdWithClient(this.prisma, id);
    } catch (error) {
      this.handleError(error, 'Failed to get inventory item');
    }
  }

  async receiveInventory(
    body: ReceiveInventoryDto,
    actorUserId?: string,
  ): Promise<InventoryItemDetails> {
    try {
      this.validateReceivePayload(body);

      const actor =
        await this.stockMovementsService.requireAuthenticatedActor(actorUserId);

      this.stockMovementsService.assertExportZoneModificationAllowed(
        actor.role,
        body.warehouseZone,
      );

      return await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: body.productId },
          select: { id: true },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with id ${body.productId} was not found`,
          );
        }

        if (body.jobId) {
          const job = await tx.productionJob.findFirst({
            where: {
              id: body.jobId,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (!job) {
            throw new NotFoundException(
              `Production job with id ${body.jobId} was not found`,
            );
          }
        }

        const item = await tx.inventoryItem.create({
          data: {
            productId: body.productId,
            quantity: body.quantity,
            warehouseZone: body.warehouseZone,
            locationCode: body.locationCode,
            receivedAt: this.parseOptionalDate(body.receivedAt) ?? new Date(),
            jobId: body.jobId,
          },
        });

        await this.stockMovementsService.createMovementWithinTx(tx, {
          itemId: item.id,
          movementType: 'RECEIVE',
          quantity: body.quantity,
          performedBy: actor.id,
          reason: 'Stock received into inventory',
        });

        return await this.getInventoryByIdWithClient(tx, item.id);
      });
    } catch (error) {
      this.handleError(error, 'Failed to receive inventory');
    }
  }

  async transferInventory(
    id: string,
    body: TransferInventoryDto,
    actorUserId?: string,
  ): Promise<InventoryTransferResult> {
    try {
      this.validateTransferPayload(body);

      const actor =
        await this.stockMovementsService.requireAuthenticatedActor(actorUserId);

      return await this.prisma.$transaction(async (tx) => {
        const sourceItem = await tx.inventoryItem.findUnique({
          where: { id },
        });

        if (!sourceItem) {
          throw new NotFoundException(`Inventory item with id ${id} was not found`);
        }

        const targetZone = body.warehouseZone;
        const targetLocation = body.locationCode;

        this.stockMovementsService.assertExportZoneModificationAllowed(
          actor.role,
          sourceItem.warehouseZone,
        );
        this.stockMovementsService.assertExportZoneModificationAllowed(
          actor.role,
          targetZone,
        );

        if (
          sourceItem.warehouseZone === targetZone &&
          sourceItem.locationCode === targetLocation
        ) {
          throw new BadRequestException(
            'Transfer destination must differ from source location or zone',
          );
        }

        if (body.quantity > sourceItem.quantity) {
          throw new BadRequestException('Transfer quantity exceeds source quantity');
        }

        const decrementResult = await tx.inventoryItem.updateMany({
          where: {
            id: sourceItem.id,
            quantity: {
              gte: body.quantity,
            },
          },
          data: {
            quantity: {
              decrement: body.quantity,
            },
          },
        });

        if (decrementResult.count === 0) {
          throw new BadRequestException(
            'Transfer could not be completed due to concurrent stock changes',
          );
        }

        const destinationExisting = await tx.inventoryItem.findFirst({
          where: {
            productId: sourceItem.productId,
            jobId: sourceItem.jobId,
            warehouseZone: targetZone,
            locationCode: targetLocation,
          },
        });

        const destinationItem = destinationExisting
          ? await tx.inventoryItem.update({
              where: { id: destinationExisting.id },
              data: {
                quantity: {
                  increment: body.quantity,
                },
              },
            })
          : await tx.inventoryItem.create({
              data: {
                productId: sourceItem.productId,
                jobId: sourceItem.jobId,
                quantity: body.quantity,
                warehouseZone: targetZone,
                locationCode: targetLocation,
                receivedAt: new Date(),
              },
            });

        const reason = body.reason?.trim() || 'Inventory transfer';

        await this.stockMovementsService.createMovementWithinTx(tx, {
          itemId: sourceItem.id,
          movementType: 'TRANSFER_OUT',
          quantity: -body.quantity,
          performedBy: actor.id,
          reason,
        });

        await this.stockMovementsService.createMovementWithinTx(tx, {
          itemId: destinationItem.id,
          movementType: 'TRANSFER_IN',
          quantity: body.quantity,
          performedBy: actor.id,
          reason,
        });

        const updatedSource = await tx.inventoryItem.findUnique({
          where: { id: sourceItem.id },
        });

        if (!updatedSource) {
          throw new NotFoundException(
            `Inventory item with id ${sourceItem.id} was not found`,
          );
        }

        return {
          sourceItem: updatedSource,
          destinationItem,
        };
      });
    } catch (error) {
      this.handleError(error, 'Failed to transfer inventory');
    }
  }

  private async getInventoryByIdWithClient(
    client: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<InventoryItemDetails> {
    const item = await client.inventoryItem.findUnique({
      where: { id },
      include: {
        product: true,
        job: true,
        stockMovements: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: [{ movedAt: 'desc' }, { id: 'desc' }],
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with id ${id} was not found`);
    }

    return item;
  }

  private validateReceivePayload(body: ReceiveInventoryDto): void {
    if (!body.productId?.trim()) {
      throw new BadRequestException('productId is required');
    }

    if (!Number.isFinite(body.quantity) || body.quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    if (!body.warehouseZone?.trim()) {
      throw new BadRequestException('warehouseZone is required');
    }

    if (!body.locationCode?.trim()) {
      throw new BadRequestException('locationCode is required');
    }
  }

  private validateTransferPayload(body: TransferInventoryDto): void {
    if (!Number.isFinite(body.quantity) || body.quantity <= 0) {
      throw new BadRequestException('quantity must be a positive number');
    }

    if (!body.warehouseZone?.trim()) {
      throw new BadRequestException('warehouseZone is required');
    }

    if (!body.locationCode?.trim()) {
      throw new BadRequestException('locationCode is required');
    }
  }

  private parseOptionalDate(value?: string | Date): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('receivedAt must be a valid date');
    }

    return parsed;
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
