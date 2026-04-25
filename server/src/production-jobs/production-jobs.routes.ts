import { ProcessType } from '@prisma/client';

export const PRODUCTION_JOBS_ROUTES = {
  BASE: 'production-jobs',
  BY_ID: ':id',
  INSPECTIONS_BY_JOB: ':jobId/inspections',
} as const;

export const INSPECTIONS_ROUTES = {
  BASE: 'inspections',
  BY_ID: ':id',
} as const;

export interface ProductionJobListFilters {
  status?: string;
  processType?: ProcessType;
  startDate?: Date;
  endDate?: Date;
}
