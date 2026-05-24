export const SUPPLIERS_ROUTES = {
  BASE: 'suppliers',
  BY_ID: ':id',
} as const;

export interface SupplierListFilters {
  search?: string;
  country?: string;
}
