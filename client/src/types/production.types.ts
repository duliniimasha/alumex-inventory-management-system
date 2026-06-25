export type JobStatus =
  'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

export type ProcessType =
  | 'extrusion'
  | 'powder_coating'
  | 'anodizing'
  | 'die_casting'
  | 'cutting'
  | 'welding'
  | 'laser'
  | 'cnc'
  | 'other';

export type QcResult = 'pass' | 'hold' | 'reject';

// Surface finishes from the Alco price list.
export type FinishCode = 'NA' | 'PC' | 'MF' | 'BR' | 'WF';

export interface ProductionJob {
  id: string;
  material_id: string;
  die_id: string | null;
  process_type: ProcessType;
  input_qty_kg: number;
  output_qty_kg: number | null;
  // Practical production attributes (stored in the job metadata).
  finish_type?: string | null;
  standard_length_mm?: number | null;
  output_pcs?: number | null;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  raw_material?: {
    id: string;
    material_type: string;
    grade: string | null;
    quantity_kg: number;
    reorder_level?: number;
  };
  die?: {
    id: string;
    profile_code: string;
    product_category?: string;
    condition: string;
  };
  qc_inspections?: QcInspection[];
  _count?: {
    qc_inspections: number;
  };
}

export interface QcInspection {
  id: string;
  job_id: string;
  result: QcResult;
  inspector_name: string;
  notes: string | null;
  inspected_at: string;
  created_at: string;
}

export interface CreateProductionJobDto {
  material_id: string;
  die_id?: string;
  process_type: ProcessType;
  input_qty_kg: number;
  output_qty_kg?: number;
  finish_type?: string;
  standard_length_mm?: number;
  output_pcs?: number;
}

export interface UpdateProductionJobDto {
  status?: JobStatus;
  output_qty_kg?: number;
  completed_at?: string;
  finish_type?: string;
  standard_length_mm?: number;
  output_pcs?: number;
}

export interface CreateQcInspectionDto {
  result: QcResult;
  inspector_name: string;
  notes?: string;
}

export interface UpdateQcInspectionDto {
  result?: QcResult;
  notes?: string;
}

export interface ProductionJobFilters {
  status?: JobStatus | '';
  process_type?: ProcessType | '';
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}
