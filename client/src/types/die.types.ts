export interface Die {
  id: string;
  profile_code: string;
  product_category: string;
  usage_count: number;
  max_usage: number;
  condition: string;
  deleted_at: string | null;
}

export interface DieFilters {
  profile_code?: string;
  condition?: string;
  near_max_usage?: boolean;
  page?: number;
  limit?: number;
}
