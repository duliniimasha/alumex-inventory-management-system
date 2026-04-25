import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProcessType,
  ProductionJob,
  QcInspection,
  QcStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionJobListFilters } from './production-jobs.routes';

const JOB_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
} as const;

const USER_UPDATEABLE_STATUSES = new Set<string>([
  JOB_STATUSES.PENDING,
  JOB_STATUSES.IN_PROGRESS,
  JOB_STATUSES.COMPLETED,
  JOB_STATUSES.CANCELLED,
]);

const TRANSITIONS: Record<string, string[]> = {
  [JOB_STATUSES.PENDING]: [JOB_STATUSES.IN_PROGRESS, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.IN_PROGRESS]: [JOB_STATUSES.COMPLETED, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.ON_HOLD]: [JOB_STATUSES.IN_PROGRESS, JOB_STATUSES.CANCELLED],
  [JOB_STATUSES.COMPLETED]: [],
  [JOB_STATUSES.CANCELLED]: [],
};

export interface CreateProductionJobDto {
  materialId: string;
  dieId: string;
  processType: ProcessType | string;
  inputQtyKg: number;
  outputQtyKg?: number;
  status?: string;
  metadata?: Prisma.InputJsonValue;
  startedAt?: string | Date;
}

export interface UpdateProductionJobStatusDto {
  status: string;
}

export interface CreateInspectionDto {
  result: string;
  inspectorName: string;
  notes?: string;
}

export interface UpdateInspectionDto {
  result?: string;
  notes?: string;
}

export type ProductionJobDetails = Prisma.ProductionJobGetPayload<{
  include: {
    material: true;
    die: true;
    qcInspections: true;
    inventoryItems: true;
  };
}>;

@Injectable()
export class ProductionJobsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getProductionJobByIdWithClient(
    client: Prisma.TransactionClient | PrismaService,
    id: string,
  ): Promise<ProductionJobDetails> {
    const job = await client.productionJob.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        material: true,
        die: true,
        qcInspections: {
          orderBy: { inspectedAt: 'desc' },
        },
        inventoryItems: {
          orderBy: { receivedAt: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Production job with id ${id} was not found`);
    }

    return job;
  }

  async listProductionJobs(
    filters: ProductionJobListFilters,
  ): Promise<ProductionJob[]> {
    try {
      const where: Prisma.ProductionJobWhereInput = {
        deletedAt: null,
      };

      if (filters.status) {
        where.status = filters.status.toLowerCase();
      }

      if (filters.processType) {
        where.processType = filters.processType;
      }

      if (filters.startDate || filters.endDate) {
        where.startedAt = {};

        if (filters.startDate) {
          where.startedAt.gte = filters.startDate;
        }

        if (filters.endDate) {
          where.startedAt.lte = filters.endDate;
        }
      }

      return await this.prisma.productionJob.findMany({
        where,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      });
    } catch (error) {
      this.handleError(error, 'Failed to list production jobs');
    }
  }

  async getProductionJobById(id: string): Promise<ProductionJobDetails> {
    try {
      return await this.getProductionJobByIdWithClient(this.prisma, id);
    } catch (error) {
      this.handleError(error, 'Failed to get production job');
    }
  }

  async createProductionJob(
    body: CreateProductionJobDto,
  ): Promise<ProductionJobDetails> {
    try {
      this.validateCreateJobPayload(body);

      const processType = this.parseProcessType(body.processType);
      const status = this.normalizeJobStatus(body.status ?? JOB_STATUSES.PENDING);

      if (
        status !== JOB_STATUSES.PENDING &&
        status !== JOB_STATUSES.IN_PROGRESS
      ) {
        throw new BadRequestException(
          'New jobs can only start as pending or in_progress',
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        const [material, die] = await Promise.all([
          tx.rawMaterial.findFirst({
            where: { id: body.materialId, deletedAt: null },
          }),
          tx.die.findFirst({
            where: { id: body.dieId, deletedAt: null },
          }),
        ]);

        if (!material) {
          throw new NotFoundException(
            `Raw material with id ${body.materialId} was not found`,
          );
        }

        if (!die) {
          throw new NotFoundException(`Die with id ${body.dieId} was not found`);
        }

        const deduction = await tx.rawMaterial.updateMany({
          where: {
            id: body.materialId,
            deletedAt: null,
            quantityKg: { gte: body.inputQtyKg },
          },
          data: {
            quantityKg: {
              decrement: body.inputQtyKg,
            },
          },
        });

        if (deduction.count === 0) {
          throw new BadRequestException(
            'Insufficient raw material quantity for this production job',
          );
        }

        const createdJob = await tx.productionJob.create({
          data: {
            materialId: body.materialId,
            dieId: body.dieId,
            processType,
            inputQtyKg: body.inputQtyKg,
            outputQtyKg: body.outputQtyKg,
            status,
            startedAt:
              status === JOB_STATUSES.IN_PROGRESS
                ? this.parseOptionalDate(body.startedAt) ?? new Date()
                : this.parseOptionalDate(body.startedAt),
            metadata: body.metadata,
          },
        });

        return this.getProductionJobByIdWithClient(tx, createdJob.id);
      });
    } catch (error) {
      this.handleError(error, 'Failed to create production job');
    }
  }

  async updateProductionJobStatus(
    id: string,
    body: UpdateProductionJobStatusDto,
  ): Promise<ProductionJobDetails> {
    try {
      const targetStatus = this.normalizeJobStatus(body.status);

      if (!USER_UPDATEABLE_STATUSES.has(targetStatus)) {
        throw new BadRequestException(
          'Status must be one of pending, in_progress, completed, cancelled',
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        const job = await tx.productionJob.findFirst({
          where: {
            id,
            deletedAt: null,
          },
          include: {
            die: true,
            qcInspections: true,
            inventoryItems: true,
          },
        });

        if (!job) {
          throw new NotFoundException(`Production job with id ${id} was not found`);
        }

        const currentStatus = this.normalizeJobStatus(job.status);

        if (currentStatus === targetStatus) {
          return this.getProductionJobByIdWithClient(tx, id);
        }

        if (!this.canTransition(currentStatus, targetStatus)) {
          throw new BadRequestException(
            `Cannot transition status from ${currentStatus} to ${targetStatus}`,
          );
        }

        const updateData: Prisma.ProductionJobUpdateInput = {
          status: targetStatus,
        };

        if (targetStatus === JOB_STATUSES.IN_PROGRESS && !job.startedAt) {
          updateData.startedAt = new Date();
        }

        if (targetStatus === JOB_STATUSES.COMPLETED) {
          const hasPassedInspection = job.qcInspections.some(
            (inspection) => inspection.status === QcStatus.PASS,
          );

          if (!hasPassedInspection) {
            throw new BadRequestException(
              'A job cannot be completed without at least one PASS QC inspection',
            );
          }

          if (!job.outputQtyKg || job.outputQtyKg <= 0) {
            throw new BadRequestException(
              'output_qty_kg must be greater than zero before completing a job',
            );
          }

          const product = await tx.product.findFirst({
            where: {
              category: {
                equals: job.die.productCategory,
                mode: 'insensitive',
              },
            },
            orderBy: { id: 'asc' },
          });

          if (!product) {
            throw new NotFoundException(
              `No product found for category ${job.die.productCategory}`,
            );
          }

          updateData.completedAt = new Date();
          updateData.qcStatus = QcStatus.PASS;

          if (job.inventoryItems.length === 0) {
            await tx.inventoryItem.create({
              data: {
                productId: product.id,
                jobId: job.id,
                quantity: job.outputQtyKg,
                locationCode: 'FG-DEFAULT',
                warehouseZone: 'FINISHED_GOODS',
              },
            });
          }
        }

        if (targetStatus === JOB_STATUSES.CANCELLED) {
          updateData.completedAt = null;
        }

        await tx.productionJob.update({
          where: { id },
          data: updateData,
        });

        return this.getProductionJobByIdWithClient(tx, id);
      });
    } catch (error) {
      this.handleError(error, 'Failed to update production job status');
    }
  }

  async softDeleteProductionJob(id: string): Promise<ProductionJob> {
    try {
      const job = await this.prisma.productionJob.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!job) {
        throw new NotFoundException(`Production job with id ${id} was not found`);
      }

      if (this.normalizeJobStatus(job.status) !== JOB_STATUSES.PENDING) {
        throw new BadRequestException(
          'Only jobs in pending status can be soft deleted',
        );
      }

      return await this.prisma.productionJob.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handleError(error, 'Failed to soft delete production job');
    }
  }

  async listInspectionsByJob(jobId: string): Promise<QcInspection[]> {
    try {
      await this.ensureJobExists(jobId);

      return await this.prisma.qcInspection.findMany({
        where: { jobId },
        orderBy: [{ inspectedAt: 'desc' }, { id: 'desc' }],
      });
    } catch (error) {
      this.handleError(error, 'Failed to list inspections for the job');
    }
  }

  async createInspection(
    jobId: string,
    body: CreateInspectionDto,
  ): Promise<QcInspection> {
    try {
      if (!body.inspectorName?.trim()) {
        throw new BadRequestException('inspectorName is required');
      }

      const inspectionStatus = this.parseInspectionStatus(body.result);

      return await this.prisma.$transaction(async (tx) => {
        const job = await tx.productionJob.findFirst({
          where: {
            id: jobId,
            deletedAt: null,
          },
        });

        if (!job) {
          throw new NotFoundException(
            `Production job with id ${jobId} was not found`,
          );
        }

        const inspection = await tx.qcInspection.create({
          data: {
            jobId,
            status: inspectionStatus,
            inspectorName: body.inspectorName,
            notes: body.notes,
          },
        });

        const jobUpdate: Prisma.ProductionJobUpdateInput = {
          qcStatus: inspectionStatus,
        };

        if (inspectionStatus === QcStatus.REJECT) {
          jobUpdate.status = JOB_STATUSES.ON_HOLD;
        }

        await tx.productionJob.update({
          where: { id: jobId },
          data: jobUpdate,
        });

        return inspection;
      });
    } catch (error) {
      this.handleError(error, 'Failed to create inspection');
    }
  }

  async updateInspection(
    id: string,
    body: UpdateInspectionDto,
  ): Promise<QcInspection> {
    try {
      if (!body.result && body.notes === undefined) {
        throw new BadRequestException('At least one field must be provided');
      }

      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.qcInspection.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new NotFoundException(`Inspection with id ${id} was not found`);
        }

        const nextStatus = body.result
          ? this.parseInspectionStatus(body.result)
          : undefined;

        const inspection = await tx.qcInspection.update({
          where: { id },
          data: {
            status: nextStatus,
            notes: body.notes,
          },
        });

        if (nextStatus) {
          const jobUpdate: Prisma.ProductionJobUpdateInput = {
            qcStatus: nextStatus,
          };

          if (nextStatus === QcStatus.REJECT) {
            jobUpdate.status = JOB_STATUSES.ON_HOLD;
          }

          await tx.productionJob.update({
            where: { id: existing.jobId },
            data: jobUpdate,
          });
        }

        return inspection;
      });
    } catch (error) {
      this.handleError(error, 'Failed to update inspection');
    }
  }

  private async ensureJobExists(jobId: string): Promise<void> {
    const job = await this.prisma.productionJob.findFirst({
      where: {
        id: jobId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException(`Production job with id ${jobId} was not found`);
    }
  }

  private validateCreateJobPayload(body: CreateProductionJobDto): void {
    if (!body.materialId?.trim()) {
      throw new BadRequestException('materialId is required');
    }

    if (!body.dieId?.trim()) {
      throw new BadRequestException('dieId is required');
    }

    if (!body.processType) {
      throw new BadRequestException('processType is required');
    }

    if (!Number.isFinite(body.inputQtyKg) || body.inputQtyKg <= 0) {
      throw new BadRequestException('inputQtyKg must be greater than zero');
    }

    if (
      body.outputQtyKg !== undefined &&
      (!Number.isFinite(body.outputQtyKg) || body.outputQtyKg < 0)
    ) {
      throw new BadRequestException('outputQtyKg must be zero or greater');
    }
  }

  private parseProcessType(value: ProcessType | string): ProcessType {
    const normalized = String(value).trim().toUpperCase();

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
          'processType must be one of EXTRUSION, COATING, DIE_CASTING, VALUE_ADD',
        );
    }
  }

  private parseInspectionStatus(value: string): QcStatus {
    const normalized = value.trim().toUpperCase();

    switch (normalized) {
      case QcStatus.PASS:
        return QcStatus.PASS;
      case QcStatus.HOLD:
        return QcStatus.HOLD;
      case QcStatus.REJECT:
        return QcStatus.REJECT;
      default:
        throw new BadRequestException('result must be pass, hold, or reject');
    }
  }

  private normalizeJobStatus(status: string): string {
    return status.trim().toLowerCase();
  }

  private canTransition(currentStatus: string, targetStatus: string): boolean {
    const allowedTargets = TRANSITIONS[currentStatus] ?? [];
    return allowedTargets.includes(targetStatus);
  }

  private parseOptionalDate(value?: string | Date): Date | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date value provided');
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
