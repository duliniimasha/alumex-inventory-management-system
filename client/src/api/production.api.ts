import api from './axios';
import type { PaginatedResponse } from '../types/supplier.types';
import type {
  CreateProductionJobDto,
  CreateQcInspectionDto,
  JobStatus,
  ProcessType,
  ProductionJob,
  ProductionJobFilters,
  QcInspection,
  QcResult,
  UpdateProductionJobDto,
  UpdateQcInspectionDto,
} from '../types/production.types';

interface ProductionJobApiMaterial {
  id: string;
  materialType?: string;
  grade?: string | null;
  quantityKg?: number;
  reorderLevel?: number;
}

interface ProductionJobApiDie {
  id: string;
  profileCode: string;
  productCategory?: string;
  condition: string;
}

interface ProductionJobMetadata {
  finish?: string | null;
  standard_length_mm?: number | null;
  output_pcs?: number | null;
  [key: string]: unknown;
}

interface QcInspectionApiModel {
  id: string;
  jobId: string;
  status: string;
  inspectorName: string;
  notes?: string | null;
  inspectedAt?: string;
  createdAt?: string;
}

interface ProductionJobApiCount {
  qcInspections?: number;
}

interface ProductionJobApiModel {
  id: string;
  materialId: string;
  dieId?: string | null;
  processType?: string;
  inputQtyKg?: number;
  outputQtyKg?: number | null;
  status?: string;
  metadata?: ProductionJobMetadata | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  material?: ProductionJobApiMaterial;
  die?: ProductionJobApiDie;
  qcInspections?: QcInspectionApiModel[];
  _count?: ProductionJobApiCount;
}

interface ProductionJobResponse {
  success: boolean;
  message: string;
  data: ProductionJobApiModel;
}

interface ProductionJobListResponse {
  success: boolean;
  message: string;
  data: ProductionJobApiModel[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface QcInspectionResponse {
  success: boolean;
  message: string;
  data: QcInspectionApiModel;
}

interface QcInspectionListResponse {
  success: boolean;
  message: string;
  data: QcInspectionApiModel[];
}

function mapJobStatus(status: string | undefined): JobStatus {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'on_hold':
      return 'on_hold';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapQcResult(value: string | undefined): QcResult {
  switch (value?.toLowerCase()) {
    case 'pass':
      return 'pass';
    case 'hold':
      return 'hold';
    case 'reject':
      return 'reject';
    default:
      return 'hold';
  }
}

function mapProcessType(value: string | undefined): ProcessType {
  switch (value?.toUpperCase()) {
    case 'EXTRUSION':
      return 'extrusion';
    case 'COATING':
      return 'powder_coating';
    case 'ANODIZING':
      return 'anodizing';
    case 'DIE_CASTING':
      return 'die_casting';
    case 'CUTTING':
      return 'cutting';
    case 'WELDING':
      return 'welding';
    case 'LASER':
      return 'laser';
    case 'CNC':
      return 'cnc';
    case 'POWDER_COATING':
      return 'powder_coating';
    case 'VALUE_ADD':
      return 'other';
    default:
      return 'other';
  }
}

function toApiProcessType(value: ProcessType): string {
  switch (value) {
    case 'extrusion':
      return 'EXTRUSION';
    case 'powder_coating':
    case 'anodizing':
      return 'COATING';
    case 'die_casting':
      return 'DIE_CASTING';
    case 'cutting':
    case 'welding':
    case 'laser':
    case 'cnc':
    case 'other':
      return 'VALUE_ADD';
  }
}

function toQcInspection(model: QcInspectionApiModel): QcInspection {
  const inspectedAt = model.inspectedAt ?? '';

  return {
    id: model.id,
    job_id: model.jobId,
    result: mapQcResult(model.status),
    inspector_name: model.inspectorName,
    notes: model.notes ?? null,
    inspected_at: inspectedAt,
    created_at: model.createdAt ?? inspectedAt,
  };
}

function toFiniteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toProductionJob(model: ProductionJobApiModel): ProductionJob {
  const metadata = model.metadata ?? {};

  return {
    id: model.id,
    material_id: model.materialId,
    die_id: model.dieId ?? null,
    process_type: mapProcessType(model.processType),
    input_qty_kg: Number.isFinite(model.inputQtyKg) ? model.inputQtyKg : 0,
    output_qty_kg: Number.isFinite(model.outputQtyKg)
      ? model.outputQtyKg
      : null,
    finish_type: typeof metadata.finish === 'string' ? metadata.finish : null,
    standard_length_mm: toFiniteOrNull(metadata.standard_length_mm),
    output_pcs: toFiniteOrNull(metadata.output_pcs),
    status: mapJobStatus(model.status),
    started_at: model.startedAt ?? null,
    completed_at: model.completedAt ?? null,
    created_at: model.createdAt ?? '',
    updated_at: model.updatedAt ?? '',
    raw_material: model.material
      ? {
          id: model.material.id,
          material_type: model.material.materialType ?? '',
          grade: model.material.grade ?? null,
          quantity_kg: Number.isFinite(model.material.quantityKg)
            ? model.material.quantityKg
            : 0,
          reorder_level: Number.isFinite(model.material.reorderLevel)
            ? model.material.reorderLevel
            : undefined,
        }
      : undefined,
    die: model.die
      ? {
          id: model.die.id,
          profile_code: model.die.profileCode,
          product_category: model.die.productCategory,
          condition: model.die.condition,
        }
      : undefined,
    qc_inspections: model.qcInspections
      ? model.qcInspections.map(toQcInspection)
      : undefined,
    _count: model._count
      ? {
          qc_inspections: model._count.qcInspections ?? 0,
        }
      : undefined,
  };
}

function buildMetadataPatch(dto: {
  finish_type?: string;
  standard_length_mm?: number;
  output_pcs?: number;
}): ProductionJobMetadata | undefined {
  const metadata: ProductionJobMetadata = {};

  if (dto.finish_type !== undefined) {
    metadata.finish = dto.finish_type;
  }

  if (dto.standard_length_mm !== undefined) {
    metadata.standard_length_mm = dto.standard_length_mm;
  }

  if (dto.output_pcs !== undefined) {
    metadata.output_pcs = dto.output_pcs;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function toCreateJobPayload(dto: CreateProductionJobDto) {
  const payload: Record<string, unknown> = {
    materialId: dto.material_id,
    processType: toApiProcessType(dto.process_type),
    inputQtyKg: dto.input_qty_kg,
  };

  if (dto.die_id !== undefined) {
    payload.dieId = dto.die_id;
  }

  if (dto.output_qty_kg !== undefined) {
    payload.outputQtyKg = dto.output_qty_kg;
  }

  const metadata = buildMetadataPatch(dto);
  if (metadata) {
    payload.metadata = metadata;
  }

  return payload;
}

function toUpdateJobPayload(dto: UpdateProductionJobDto) {
  const payload: Record<string, unknown> = {};

  if (dto.status !== undefined) {
    payload.status = dto.status;
  }

  if (dto.output_qty_kg !== undefined) {
    payload.outputQtyKg = dto.output_qty_kg;
  }

  if (dto.completed_at !== undefined) {
    payload.completedAt = dto.completed_at;
  }

  const metadata = buildMetadataPatch(dto);
  if (metadata) {
    payload.metadata = metadata;
  }

  return payload;
}

function toCreateInspectionPayload(dto: CreateQcInspectionDto) {
  return {
    result: dto.result,
    inspectorName: dto.inspector_name,
    notes: dto.notes,
  };
}

function toUpdateInspectionPayload(dto: UpdateQcInspectionDto) {
  const payload: Record<string, unknown> = {};

  if (dto.result !== undefined) {
    payload.result = dto.result;
  }

  if (dto.notes !== undefined) {
    payload.notes = dto.notes;
  }

  return payload;
}

function toListFilters(filters?: ProductionJobFilters) {
  const params: Record<string, unknown> = {};

  if (filters?.status) {
    params.status = filters.status;
  }

  if (filters?.process_type) {
    params.process_type = toApiProcessType(filters.process_type);
  }

  if (filters?.from_date) {
    params.start_date = filters.from_date;
  }

  if (filters?.to_date) {
    params.end_date = filters.to_date;
  }

  if (filters?.search) {
    params.search = filters.search;
  }

  if (filters?.page) {
    params.page = filters.page;
  }

  if (filters?.limit) {
    params.limit = filters.limit;
  }

  return params;
}

export async function getProductionJobs(
  filters?: ProductionJobFilters,
): Promise<PaginatedResponse<ProductionJob>> {
  const response = await api.get<ProductionJobListResponse>('/production-jobs', {
    params: toListFilters(filters),
  });

  const mappedData = response.data.data.map(toProductionJob);
  const page = response.data.pagination?.page ?? filters?.page ?? 1;
  const limit = response.data.pagination?.limit ?? filters?.limit ?? Math.max(mappedData.length, 1);
  const total = response.data.pagination?.total ?? mappedData.length;
  const totalPages =
    response.data.pagination?.totalPages ??
    (total === 0 ? 1 : Math.ceil(total / limit));

  return {
    success: response.data.success,
    message: response.data.message,
    data: mappedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getProductionJobById(id: string): Promise<ProductionJob> {
  const response = await api.get<ProductionJobResponse>(`/production-jobs/${id}`);
  return toProductionJob(response.data.data);
}

export async function createProductionJob(
  dto: CreateProductionJobDto,
): Promise<ProductionJob> {
  const response = await api.post<ProductionJobResponse>(
    '/production-jobs',
    toCreateJobPayload(dto),
  );
  return toProductionJob(response.data.data);
}

export async function updateProductionJob(
  id: string,
  dto: UpdateProductionJobDto,
): Promise<ProductionJob> {
  const response = await api.put<ProductionJobResponse>(
    `/production-jobs/${id}`,
    toUpdateJobPayload(dto),
  );
  return toProductionJob(response.data.data);
}

export async function deleteProductionJob(id: string): Promise<void> {
  await api.delete(`/production-jobs/${id}`);
}

export async function getInspectionsByJobId(jobId: string): Promise<QcInspection[]> {
  const response = await api.get<QcInspectionListResponse>(
    `/production-jobs/${jobId}/inspections`,
  );
  return response.data.data.map(toQcInspection);
}

export async function createInspection(
  jobId: string,
  dto: CreateQcInspectionDto,
): Promise<QcInspection> {
  const response = await api.post<QcInspectionResponse>(
    `/production-jobs/${jobId}/inspections`,
    toCreateInspectionPayload(dto),
  );
  return toQcInspection(response.data.data);
}

export async function updateInspection(
  inspectionId: string,
  dto: UpdateQcInspectionDto,
): Promise<QcInspection> {
  const response = await api.put<QcInspectionResponse>(
    `/inspections/${inspectionId}`,
    toUpdateInspectionPayload(dto),
  );
  return toQcInspection(response.data.data);
}
