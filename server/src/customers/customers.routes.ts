export const CUSTOMERS_ROUTES = {
  BASE: 'customers',
  BY_ID: ':id',
} as const;

export const CUSTOMER_TYPES = ['B2B', 'fabricator', 'export', 'retail', 'government'] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export interface CustomerListFilters {
  type?: CustomerType;
  country?: string;
  ownerUserId?: string;
  search?: string;
}
