import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProcessType, ProductionJob, QcInspection } from '@prisma/client';
import { ApiResponse } from '../common/api-response.interface';
import { PRODUCTION_JOBS_ROUTES } from './production-jobs.routes';
import { ProductionJobsService } from './production-jobs.service';
import {
  type CreateInspectionDto,
  type CreateProductionJobDto,
  type ProductionJobDetails,
  type UpdateProductionJobStatusDto,
} from './production-jobs.service';

@Controller(PRODUCTION_JOBS_ROUTES.BASE)
export class ProductionJobsController {
  constructor(private readonly productionJobsService: ProductionJobsService) {}

  @Get()
  async listProductionJobs(
    @Query('status') status?: string,
    @Query('process_type') processTypeRaw?: string,
    @Query('start_date') startDateRaw?: string,
    @Query('end_date') endDateRaw?: string,
  ): Promise<ApiResponse<ProductionJob[]>> {
    try {
      const startDate = this.parseDateFilter(startDateRaw, 'start_date');
      const endDate = this.parseDateFilter(endDateRaw, 'end_date');

      if (startDate && endDate && startDate > endDate) {
        throw new BadRequestException('start_date must be before end_date');
      }

      const jobs = await this.productionJobsService.listProductionJobs({
        status,
        processType: processTypeRaw
          ? this.parseProcessTypeFilter(processTypeRaw)
          : undefined,
        startDate,
        endDate,
      });

      return {
        success: true,
        data: jobs,
        message: 'Production jobs fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch production jobs');
    }
  }

  @Get(PRODUCTION_JOBS_ROUTES.BY_ID)
  async getProductionJobById(
    @Param('id') id: string,
  ): Promise<ApiResponse<ProductionJobDetails>> {
    try {
      const job = await this.productionJobsService.getProductionJobById(id);

      return {
        success: true,
        data: job,
        message: 'Production job fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch production job');
    }
  }

  @Post()
  async createProductionJob(
    @Body() body: CreateProductionJobDto,
  ): Promise<ApiResponse<ProductionJobDetails>> {
    try {
      const job = await this.productionJobsService.createProductionJob(body);

      return {
        success: true,
        data: job,
        message: 'Production job created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create production job');
    }
  }

  @Put(PRODUCTION_JOBS_ROUTES.BY_ID)
  async updateProductionJobStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductionJobStatusDto,
  ): Promise<ApiResponse<ProductionJobDetails>> {
    try {
      const job = await this.productionJobsService.updateProductionJobStatus(
        id,
        body,
      );

      return {
        success: true,
        data: job,
        message: 'Production job status updated successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to update production job status');
    }
  }

  @Delete(PRODUCTION_JOBS_ROUTES.BY_ID)
  async deleteProductionJob(
    @Param('id') id: string,
  ): Promise<ApiResponse<ProductionJob>> {
    try {
      const job = await this.productionJobsService.softDeleteProductionJob(id);

      return {
        success: true,
        data: job,
        message: 'Production job deleted successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to delete production job');
    }
  }

  @Get(PRODUCTION_JOBS_ROUTES.INSPECTIONS_BY_JOB)
  async listJobInspections(
    @Param('jobId') jobId: string,
  ): Promise<ApiResponse<QcInspection[]>> {
    try {
      const inspections =
        await this.productionJobsService.listInspectionsByJob(jobId);

      return {
        success: true,
        data: inspections,
        message: 'QC inspections fetched successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to fetch QC inspections');
    }
  }

  @Post(PRODUCTION_JOBS_ROUTES.INSPECTIONS_BY_JOB)
  async createJobInspection(
    @Param('jobId') jobId: string,
    @Body() body: CreateInspectionDto,
  ): Promise<ApiResponse<QcInspection>> {
    try {
      const inspection = await this.productionJobsService.createInspection(
        jobId,
        body,
      );

      return {
        success: true,
        data: inspection,
        message: 'QC inspection created successfully',
      };
    } catch (error) {
      this.handleControllerError(error, 'Failed to create QC inspection');
    }
  }

  private parseProcessTypeFilter(value: string): ProcessType {
    const normalized = value.trim().toUpperCase();

    switch (normalized) {
      case ProcessType.EXTRUSION:
        return ProcessType.EXTRUSION;
      case ProcessType.COATING:
        return ProcessType.COATING;
      case ProcessType.DIE_CASTING:
        return ProcessType.DIE_CASTING;
      case ProcessType.VALUE_ADD:
        return ProcessType.VALUE_ADD;
      default:
        throw new BadRequestException(
          'process_type must be one of EXTRUSION, COATING, DIE_CASTING, VALUE_ADD',
        );
    }
  }

  private parseDateFilter(
    value: string | undefined,
    fieldName: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return parsed;
  }

  private handleControllerError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
