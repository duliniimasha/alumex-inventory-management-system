import clsx from 'clsx';
import { Download, History } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import type { AuditLogFilters } from '../../types/user.types';
import { formatDateTime, getRoleBadgeColor, toTitleCase } from '../../utils/formatters';
import Badge from '../ui/Badge';
import FilterBar from '../ui/FilterBar';

interface AuditLogViewerProps {
  userId?: string;
  showUserFilter?: boolean;
  maxHeight?: string;
}

const ACTION_OPTIONS: Array<{ value: AuditLogFilters['action']; label: string }> = [
  { value: '', label: 'All' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

const ENTITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'User', label: 'User' },
  { value: 'RawMaterial', label: 'Raw Material' },
  { value: 'ProductionJob', label: 'Production Job' },
  { value: 'InventoryItem', label: 'Inventory Item' },
  { value: 'SalesOrder', label: 'Sales Order' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Supplier', label: 'Supplier' },
  { value: 'StockMovement', label: 'Stock Movement' },
];

const actionTone: Record<'CREATE' | 'UPDATE' | 'DELETE', 'green' | 'blue' | 'red'> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

function exportToCsv(logs: ReturnType<typeof useAuditLogs>['logs'], filename: string): void {
  const headers = ['Action', 'Entity', 'Entity ID', 'User', 'Role', 'IP Address', 'Timestamp'];
  const rows = logs.map((log) => [
    log.action,
    log.entity,
    log.entity_id,
    log.user?.name ?? '',
    log.user?.role ?? '',
    log.ip_address,
    log.timestamp,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => String(value ?? '')).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogViewer({
  userId,
  showUserFilter = true,
  maxHeight = 'auto',
}: AuditLogViewerProps) {
  const {
    logs,
    isLoading,
    error,
    pagination,
    filters,
    handleFilterChange,
    handlePageChange,
  } = useAuditLogs();

  useEffect(() => {
    if (userId) {
      handleFilterChange('user_id', userId);
    } else if (showUserFilter) {
      handleFilterChange('user_id', undefined);
    }
  }, [handleFilterChange, showUserFilter, userId]);

  const activeFilterCount = useMemo(() => {
    const count = [
      filters.action,
      filters.entity,
      filters.from_date,
      filters.to_date,
      showUserFilter ? filters.user_id : undefined,
    ].filter((value) => Boolean(value)).length;

    return count;
  }, [filters.action, filters.entity, filters.from_date, filters.to_date, filters.user_id, showUserFilter]);

  const page = pagination?.page ?? filters.page ?? 1;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  const handleResetFilters = useCallback(() => {
    handleFilterChange('action', '');
    handleFilterChange('entity', '');
    handleFilterChange('from_date', undefined);
    handleFilterChange('to_date', undefined);

    if (showUserFilter) {
      handleFilterChange('user_id', undefined);
    }
  }, [handleFilterChange, showUserFilter]);

  const handleExport = () => {
    exportToCsv(logs, `audit-logs-${userId ?? 'all'}.csv`);
  };

  const listStyle = maxHeight === 'auto' ? undefined : { maxHeight };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Audit Logs</h3>
          <p className="text-sm text-gray-500">Detailed record of user actions.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={logs.length === 0 || isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <FilterBar activeFilterCount={activeFilterCount} onReset={handleResetFilters}>
        <select
          value={filters.action ?? ''}
          onChange={(event) => handleFilterChange('action', event.target.value as AuditLogFilters['action'])}
          className="h-10 min-w-37.5 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option.label} value={option.value ?? ''}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.entity ?? ''}
          onChange={(event) => handleFilterChange('entity', event.target.value || undefined)}
          className="h-10 min-w-45 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          {ENTITY_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.from_date ?? ''}
          onChange={(event) => handleFilterChange('from_date', event.target.value || undefined)}
          className="h-10 min-w-37.5 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        />

        <input
          type="date"
          value={filters.to_date ?? ''}
          onChange={(event) => handleFilterChange('to_date', event.target.value || undefined)}
          className="h-10 min-w-37.5 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        />

        {showUserFilter ? (
          <input
            type="text"
            placeholder="User search"
            value={filters.user_id ?? ''}
            onChange={(event) => handleFilterChange('user_id', event.target.value || undefined)}
            className="h-10 min-w-50 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          />
        ) : null}
      </FilterBar>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100 overflow-y-auto" style={listStyle}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="flex items-center gap-4 px-4 py-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              ))
            : null}

          {!isLoading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 rounded-full bg-gray-100 p-3 text-gray-400">
                <History className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-gray-600">No audit log entries found</p>
            </div>
          ) : null}

          {!isLoading
            ? logs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-start gap-4 px-4 py-4">
                  <Badge label={log.action} color={actionTone[log.action]} />

                  <div className="min-w-50 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {toTitleCase(log.entity)}
                      <span className="ml-2 inline-flex max-w-36 truncate align-middle font-mono text-xs text-gray-500">
                        {log.entity_id}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>
                        by {log.user?.name ?? 'Unknown user'}
                      </span>
                      {log.user?.role ? (
                        <Badge label={toTitleCase(log.user.role)} color={getRoleBadgeColor(log.user.role)} />
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    <p>{log.ip_address}</p>
                    <p className="mt-1">{log.timestamp ? formatDateTime(log.timestamp) : '—'}</p>
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePageChange(page - 1)}
          disabled={page <= 1 || isLoading}
        >
          Previous
        </button>

        <p className="text-sm font-medium text-gray-600">
          Page {page} of {totalPages}
        </p>

        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
        >
          Next
        </button>
      </div>
    </section>
  );
}
