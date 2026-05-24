export const AUDIT_LOGS_ROUTES = {
  BASE: 'audit-logs',
} as const;

export interface AuditLogListFilters {
  userId?: string;
  actions?: string[];
  entities?: string[];
  fromDate?: Date;
  toDate?: Date;
}
