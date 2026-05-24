import type { JobStatus, ProcessType, QcResult } from '../types/production.types';

const processTypeLabels: Record<ProcessType, string> = {
  extrusion: 'Extrusion',
  powder_coating: 'Powder Coating',
  anodizing: 'Anodizing',
  die_casting: 'Die Casting',
  cutting: 'Cutting',
  welding: 'Welding',
  laser: 'Laser',
  cnc: 'CNC',
  other: 'Other',
};

const jobStatusLabels: Record<JobStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

const nextStatusMap: Record<JobStatus, JobStatus[]> = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'on_hold', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function getProcessTypeLabel(type: ProcessType): string {
  return processTypeLabels[type] ?? 'Other';
}

export function getJobStatusLabel(status: JobStatus): string {
  return jobStatusLabels[status] ?? 'Unknown';
}

export function getValidNextStatuses(current: JobStatus): JobStatus[] {
  return nextStatusMap[current] ?? [];
}

export function calculateYield(
  inputQty: number,
  outputQty: number | null,
): { percentage: number; color: 'green' | 'amber' | 'red' } | null {
  if (outputQty === null || !Number.isFinite(outputQty)) {
    return null;
  }

  if (!Number.isFinite(inputQty) || inputQty <= 0) {
    return null;
  }

  const percentage = (outputQty / inputQty) * 100;

  if (percentage >= 85) {
    return { percentage, color: 'green' };
  }

  if (percentage >= 70) {
    return { percentage, color: 'amber' };
  }

  return { percentage, color: 'red' };
}

export function getQcResultColor(result: QcResult): 'green' | 'amber' | 'red' {
  switch (result) {
    case 'pass':
      return 'green';
    case 'hold':
      return 'amber';
    case 'reject':
      return 'red';
  }
}
