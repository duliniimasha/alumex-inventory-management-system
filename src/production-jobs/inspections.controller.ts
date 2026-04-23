import {
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Param,
  Put,
} from '@nestjs/common';
import { QcInspection } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { INSPECTIONS_ROUTES } from './production-jobs.routes';
import { ProductionJobsService } from './production-jobs.service';
import type { UpdateInspectionDto } from './production-jobs.service';

@Controller(INSPECTIONS_ROUTES.BASE)
export class InspectionsController {
  constructor(private readonly productionJobsService: ProductionJobsService) {}

  @Put(INSPECTIONS_ROUTES.BY_ID)
  async updateInspection(
    @Param('id') id: string,
    @Body() body: UpdateInspectionDto,
  ): Promise<ApiResponse<QcInspection>> {
    try {
      const inspection = await this.productionJobsService.updateInspection(
        id,
        body,
      );

      return {
        success: true,
        data: inspection,
        message: 'QC inspection updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update QC inspection');
    }
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
