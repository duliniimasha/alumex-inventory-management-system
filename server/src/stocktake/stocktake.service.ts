import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';

export interface StocktakeEntryDto {
  itemId: string;
  countedQuantity: number;
}

export interface StocktakeFlaggedItem {
  itemId: string;
  systemQuantity: number;
  countedQuantity: number;
  variancePercent: number;
}

export interface StocktakeSubmitResult {
  processedCount: number;
  discrepancyCount: number;
  flaggedItemsForReview: StocktakeFlaggedItem[];
  movements: StockMovement[];
}

@Injectable()
export class StocktakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async submitStocktake(
    entries: StocktakeEntryDto[],
    actorUserId?: string,
  ): Promise<StocktakeSubmitResult> {
    try {
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new BadRequestException(
          'Stocktake payload must be a non-empty array',
        );
      }

      this.validateStocktakeEntries(entries);

      const actor =
        await this.stockMovementsService.requireAuthenticatedActor(actorUserId);

      return await this.prisma.$transaction(async (tx) => {
        const movements: StockMovement[] = [];
        const flaggedItemsForReview: StocktakeFlaggedItem[] = [];
        let discrepancyCount = 0;

        for (const entry of entries) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: entry.itemId },
          });

          if (!item) {
            throw new NotFoundException(
              `Inventory item with id ${entry.itemId} was not found`,
            );
          }

          this.stockMovementsService.assertExportZoneModificationAllowed(
            actor.role,
            item.warehouseZone,
          );

          const systemQuantity = item.quantity;
          const countedQuantity = entry.countedQuantity;
          const varianceQuantity = countedQuantity - systemQuantity;
          const variancePercent = this.calculateVariancePercent(
            systemQuantity,
            countedQuantity,
          );

          const shouldFlag = variancePercent > 2;

          const updateData: Prisma.InventoryItemUpdateInput = {};

          if (varianceQuantity !== 0) {
            updateData.quantity = countedQuantity;
          }

          if (shouldFlag) {
            updateData.needsSupervisorReview = true;
            flaggedItemsForReview.push({
              itemId: item.id,
              systemQuantity,
              countedQuantity,
              variancePercent,
            });
          }

          if (Object.keys(updateData).length > 0) {
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: updateData,
            });
          }

          if (varianceQuantity !== 0) {
            discrepancyCount += 1;

            const movement = await this.stockMovementsService.createMovementWithinTx(
              tx,
              {
                itemId: item.id,
                movementType: 'STOCKTAKE_ADJUSTMENT',
                quantity: varianceQuantity,
                performedBy: actor.id,
                reason: `Stocktake variance adjustment (system=${systemQuantity}, counted=${countedQuantity})`,
              },
            );

            movements.push(movement);
          }
        }

        return {
          processedCount: entries.length,
          discrepancyCount,
          flaggedItemsForReview,
          movements,
        };
      });
    } catch (error) {
      this.handleError(error, 'Failed to submit stocktake');
    }
  }

  private validateStocktakeEntries(entries: StocktakeEntryDto[]): void {
    const seenIds = new Set<string>();

    for (const entry of entries) {
      if (!entry.itemId?.trim()) {
        throw new BadRequestException('Each entry must include itemId');
      }

      if (!Number.isFinite(entry.countedQuantity) || entry.countedQuantity < 0) {
        throw new BadRequestException(
          'countedQuantity must be a non-negative number',
        );
      }

      if (seenIds.has(entry.itemId)) {
        throw new BadRequestException(
          `Duplicate stocktake entry found for item ${entry.itemId}`,
        );
      }

      seenIds.add(entry.itemId);
    }
  }

  private calculateVariancePercent(
    systemQuantity: number,
    countedQuantity: number,
  ): number {
    if (systemQuantity === 0) {
      return countedQuantity === 0 ? 0 : 100;
    }

    return (Math.abs(countedQuantity - systemQuantity) / systemQuantity) * 100;
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
