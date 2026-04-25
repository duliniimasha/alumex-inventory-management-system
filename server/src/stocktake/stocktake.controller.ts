import {
  Body,
  Controller,
  Headers,
  HttpException,
  InternalServerErrorException,
  Post,
  Req,
} from '@nestjs/common';
import { ApiResponse } from '../common/api-response.interface';
import { STOCKTAKE_ROUTES } from './stocktake.routes';
import { StocktakeService } from './stocktake.service';
import type {
  StocktakeEntryDto,
  StocktakeSubmitResult,
} from './stocktake.service';

@Controller(STOCKTAKE_ROUTES.BASE)
export class StocktakeController {
  constructor(private readonly stocktakeService: StocktakeService) {}

  @Post(STOCKTAKE_ROUTES.SUBMIT)
  async submitStocktake(
    @Body()
    body: Array<{
      item_id?: string;
      counted_quantity?: number;
      itemId?: string;
      countedQuantity?: number;
    }>,
    @Req() request: { user?: { id?: string } },
    @Headers('x-user-id') userIdHeader?: string,
  ): Promise<ApiResponse<StocktakeSubmitResult>> {
    try {
      const actorUserId = request.user?.id ?? userIdHeader;
      const entries: StocktakeEntryDto[] = body.map((entry) => ({
        itemId: entry.itemId ?? entry.item_id ?? '',
        countedQuantity:
          entry.countedQuantity ?? entry.counted_quantity ?? Number.NaN,
      }));

      const data = await this.stocktakeService.submitStocktake(
        entries,
        actorUserId,
      );

      return {
        success: true,
        data,
        message: 'Stocktake submitted successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to submit stocktake');
    }
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
