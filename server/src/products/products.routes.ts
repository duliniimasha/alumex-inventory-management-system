export const PRODUCTS_ROUTES = {
  BASE: 'products',
  BY_ID: ':id',
} as const;

export const PRODUCT_CATEGORIES = [
  'Architectural',
  'Household',
  'Hardware',
  'Industrial',
  'Trading',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductListFilters {
  category?: ProductCategory;
  finishType?: string;
  search?: string;
}
