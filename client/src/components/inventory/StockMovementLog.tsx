import clsx from 'clsx';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ClipboardCheck,
  Download,
  History,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useStockMovements } from '../../hooks/useStockMovements';
import type { MovementType, StockMovement, WarehouseZone } from '../../types/inventory.types';
import { formatDateTime, getRoleBadgeColor, toTitleCase } from '../../utils/formatters';
import Badge from '../ui/Badge';
import FilterBar from '../ui/FilterBar';

interface StockMovementLogProps {
  itemId?: string;
  showFilters?: boolean;
  maxHeight?: string;
}

const movementTypeOptions: Array<{ value: MovementType | ''; label: string }> = [
  { value: '', label: 'All Types' },
  { value: 'receive', label: 'Receive' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
  { value: 'stocktake_correction', label: 'Stocktake Correction' },
];

const zoneBadgeTone: Record<WarehouseZone, string> = {
  main: 'bg-blue-100 text-blue-700',
  export: 'bg-purple-100 text-purple-700',
  quarantine: 'bg-red-100 text-red-700',
  dispatch: 'bg-green-100 text-green-700',
  returns: 'bg-amber-100 text-amber-700',
};

const movementVisuals: Record<MovementType, { icon: typeof ArrowDownCircle; tone: string }> = {
  receive: { icon: ArrowDownCircle, tone: 'bg-emerald-100 text-emerald-600' },
  dispatch: { icon: ArrowUpCircle, tone: 'bg-blue-100 text-blue-600' },
  transfer: { icon: ArrowLeftRight, tone: 'bg-amber-100 text-amber-600' },
  adjustment: { icon: SlidersHorizontal, tone: 'bg-purple-100 text-purple-600' },
  return: { icon: RotateCcw, tone: 'bg-orange-100 text-orange-600' },
  stocktake_correction: { icon: ClipboardCheck, tone: 'bg-gray-100 text-gray-600' },
};

function exportToCsv(movements: StockMovement[], filename: string): void {
  const headers = [
    'Date',
    'Type',
    'Quantity',
    'Location',
    'Product SKU',
    'Performed By',
    'Reason',
  ];
  const rows = movements.map((movement) => [
    formatDateTime(movement.moved_at),
    movement.movement_type,
    movement.quantity,
    movement.inventory_item?.location_code ?? '',
    movement.inventory_item?.product?.sku ?? '',
    movement.user?.name ?? '',
    movement.reason ?? '',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(String).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function StockMovementLog({
  itemId,
  showFilters = true,
  maxHeight = 'auto',
}: StockMovementLogProps) {
  const {
    movements,
    isLoading,
    error,
    pagination,
    filters,
    handleFilterChange,
    handlePageChange,
  } = useStockMovements();

  useEffect(() => {
    if (itemId) {
      handleFilterChange('item_id', itemId);
    } else {
      handleFilterChange('item_id', undefined);
    }
  }, [handleFilterChange, itemId]);

  const activeFilterCount = useMemo(() => {
    const count = [
      filters.movement_type,
      filters.from_date,
      filters.to_date,
      filters.performed_by,
    ].filter((value) => Boolean(value)).length;

    return count;
  }, [filters.from_date, filters.movement_type, filters.performed_by, filters.to_date]);

  const page = pagination?.page ?? filters.page ?? 1;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  const handleResetFilters = useCallback(() => {
    handleFilterChange('movement_type', '');
    handleFilterChange('from_date', undefined);
    handleFilterChange('to_date', undefined);
    handleFilterChange('performed_by', undefined);
  }, [handleFilterChange]);

  const listStyle = maxHeight === 'auto' ? undefined : { maxHeight };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Stock Movement Log</h3>
          <p className="text-sm text-gray-500">
            {itemId ? 'Showing item movement history' : 'Showing warehouse movement history'}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          onClick={() => exportToCsv(movements, `stock-movements-${itemId ?? 'all'}.csv`)}
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {showFilters ? (
        <FilterBar activeFilterCount={activeFilterCount} onReset={handleResetFilters}>
          <select
            value={filters.movement_type ?? ''}
            onChange={(event) =>
              handleFilterChange('movement_type', event.target.value as MovementType | '')
            }
            className="h-10 min-w-[180px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          >
            {movementTypeOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.from_date ?? ''}
            onChange={(event) => handleFilterChange('from_date', event.target.value || undefined)}
            className="h-10 min-w-[150px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          />

          <input
            type="date"
            value={filters.to_date ?? ''}
            onChange={(event) => handleFilterChange('to_date', event.target.value || undefined)}
            className="h-10 min-w-[150px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          />

          <input
            type="text"
            value={filters.performed_by ?? ''}
            onChange={(event) => handleFilterChange('performed_by', event.target.value || undefined)}
            placeholder="Performed by"
            className="h-10 min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          />
        </FilterBar>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100 overflow-y-auto" style={listStyle}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
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

          {!isLoading && movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-3 rounded-full bg-gray-100 p-3 text-gray-400">
                <History className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-gray-600">No stock movements recorded</p>
            </div>
          ) : null}

          {!isLoading
            ? movements.map((movement) => {
                const visual = movementVisuals[movement.movement_type];
                const Icon = visual.icon;
                const label = toTitleCase(movement.movement_type);
                const location = movement.inventory_item?.location_code ?? '—';
                const sku = movement.inventory_item?.product?.sku ?? '—';
                const zone = movement.inventory_item?.warehouse_zone;
                const quantity = movement.quantity;

                const qtyStyle = clsx('text-sm font-semibold', {
                  'text-emerald-600':
                    movement.movement_type === 'receive' || movement.movement_type === 'return',
                  'text-red-600': movement.movement_type === 'dispatch',
                  'text-gray-600':
                    movement.movement_type === 'transfer' ||
                    movement.movement_type === 'adjustment' ||
                    movement.movement_type === 'stocktake_correction',
                });

                const qtyDisplay =
                  movement.movement_type === 'receive' || movement.movement_type === 'return'
                    ? `+${quantity}`
                    : movement.movement_type === 'dispatch'
                      ? `-${Math.abs(quantity)}`
                      : `${quantity}`;

                return (
                  <div key={movement.id} className="flex flex-wrap items-start gap-4 px-4 py-4">
                    <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full', visual.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-[200px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{label}</span>
                        {!itemId ? (
                          <span className="text-xs text-gray-500">
                            {sku} • {location}
                          </span>
                        ) : null}
                        {zone ? (
                          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold', zoneBadgeTone[zone])}>
                            {zone}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className={qtyStyle}>{qtyDisplay}</span>
                        {movement.reason ? (
                          <span className="text-xs italic text-gray-500">{movement.reason}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-500">Performed by</div>
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {movement.user?.name ?? 'Unknown'}
                        </span>
                        {movement.user?.role ? (
                          <Badge
                            label={toTitleCase(movement.user.role)}
                            color={getRoleBadgeColor(movement.user.role)}
                          />
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {movement.moved_at ? formatDateTime(movement.moved_at) : '—'}
                      </div>
                    </div>
                  </div>
                );
              })
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
