export type MaterialType = 'billet' | 'chemical' | 'die' | 'traded_good' | 'other';

export interface RawMaterial {
  id: string;
  material_type: MaterialType;
  grade: string | null;
  quantity_kg: number;
  unit: string;
  reorder_level: number;
  supplier_id: string;
  supplier?: {
    id: string;
    name: string;
    country: string;
    contact_email?: string | null;
  };
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateRawMaterialDto {
  material_type: MaterialType;
  grade?: string;
  quantity_kg: number;
  unit: string;
  reorder_level: number;
  supplier_id: string;
}

export type UpdateRawMaterialDto = Partial<CreateRawMaterialDto>;

export interface RawMaterialFilters {
  material_type?: MaterialType | '';
  grade?: string;
  below_reorder_level?: boolean;
  supplier_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}