export const DIES_ROUTES = {
  BASE: 'dies',
  BY_ID: ':id',
} as const;

export interface DieListFilters {
  profileCode?: string;
  condition?: string;
  nearMaxUsage?: boolean;
}
