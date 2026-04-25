export const RAW_MATERIALS_ROUTES = {
  BASE: 'raw-materials',
  BY_ID: ':id',
} as const;

export interface RawMaterialListFilters {
  materialType?: string;
  grade?: string;
  belowReorderLevel?: boolean;
}
