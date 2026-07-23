import { isAxiosError } from 'axios';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  History,
  MoreVertical,
  SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import InventoryItemDrawer from '../../components/inventory/InventoryItemDrawer';
import ReceiveStockForm from '../../components/inventory/ReceiveStockForm';
import StockMovementLog from '../../components/inventory/StockMovementLog';
import StocktakeWizard from '../../components/inventory/StocktakeWizard';
import TransferStockForm from '../../components/inventory/TransferStockForm';
import WarehouseZoneMap from '../../components/inventory/WarehouseZoneMap';
import Badge from '../../components/ui/Badge';
import DataTable, { type Column } from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ErrorAlert from '../../components/ui/ErrorAlert';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useDebounce, useInventory, usePageTitle, useRoleAccess } from '../../hooks';
import type {
  InventoryItem,
  ProductCategory,
  TransferStockDto,
  WarehouseZone,
} from '../../types/inventory.types';
import { formatDate, formatNumber, toTitleCase } from '../../utils/formatters';
import { getCategoryBadgeColor, getZoneBadgeColor } from '../../utils/inventory.utils';

const finishOptions = [
  { value: '', label: 'All Finishes' },
  { value: 'mill_finish', label: 'Mill Finish' },
  { value: 'powder_coated', label: 'Powder Coated' },
  { value: 'anodized', label: 'Anodized' },
  { value: 'wood_finish', label: 'Wood Finish' },
  { value: 'other', label: 'Other' },
] as const;

const categoryChips: Array<{ value: ProductCategory | ''; label: string }> = [
  { value: '', label: 'All Categories' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'household', label: 'Household' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'trading', label: 'Trading' },
];

function getVisiblePages(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(maxVisiblePages / 2);
  let start = Math.max(currentPage - halfWindow, 1);
  let end = start + maxVisiblePages - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisiblePages + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function InventoryItemActions({
  row,
  canTransfer,
  canAdjust,
  onViewDetails,
  onTransfer,
  onAdjust,
  onViewMovements,
}: {
  row: InventoryItem;
  canTransfer: boolean;
  canAdjust: boolean;
  onViewDetails: (item: InventoryItem) => void;
  onTransfer: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onViewMovements: (item: InventoryItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      setIsOpen(false);
    },
    [],
  );

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Inventory item actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewDetails(row))}
          >
            View Details
          </button>

          {canTransfer ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onTransfer(row))}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </button>
          ) : null}

          {canAdjust ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onAdjust(row))}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Adjust Quantity
            </button>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewMovements(row))}
          >
            <History className="h-4 w-4" />
            View Movement History
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function InventoryPage() {
  usePageTitle('Inventory');

  const { currentRole, canManageInventory } = useRoleAccess();
  const {
    items,
    isLoading,
    error,
    pagination,
    filters,
    zoneSummary,
    categorySummary,
    productsForSelect,
    productionJobsForSelect,
    fetchItems,
    handleFilterChange,
    handlePageChange,
    handleReceive,
    handleTransfer,
    handleAdjust,
  } = useInventory();

  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [locationValue, setLocationValue] = useState(filters.location_code ?? '');
  const [finishFilter, setFinishFilter] = useState('');
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isStocktakeOpen, setIsStocktakeOpen] = useState(false);
  const [isMovementLogOpen, setIsMovementLogOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<InventoryItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [scrollToMovements, setScrollToMovements] = useState(false);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  const [isReceiveSubmitting, setIsReceiveSubmitting] = useState(false);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  const debouncedSearchValue = useDebounce(searchValue, 400);

  useEffect(() => {
    const normalizedSearch = debouncedSearchValue.trim();
    if ((filters.search ?? '') !== normalizedSearch) {
      handleFilterChange('search', normalizedSearch || undefined);
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  useEffect(() => {
    if ((filters.location_code ?? '') !== locationValue) {
      handleFilterChange('location_code', locationValue.trim() || undefined);
    }
  }, [filters.location_code, handleFilterChange, locationValue]);

  useEffect(() => {
    if (!isDrawerOpen || !scrollToMovements) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const section = document.getElementById('inventory-movement-history');
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setScrollToMovements(false);
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [isDrawerOpen, scrollToMovements]);

  useEffect(() => {
    if (drawerItem) {
      const refreshed = items.find((item) => item.id === drawerItem.id);
      if (refreshed) {
        setDrawerItem(refreshed);
      }
    }
  }, [drawerItem, items]);

  const canReceiveStock =
    currentRole === 'warehouse_officer' ||
    currentRole === 'production_supervisor' ||
    currentRole === 'system_admin';

  const canRunStocktake =
    currentRole === 'warehouse_officer' || currentRole === 'system_admin';

  const canModifyStock = currentRole === 'warehouse_officer' || currentRole === 'system_admin';

  const activeCategory = filters.category ?? '';
  const activeZone = filters.warehouse_zone ?? '';

  const totalCategoryQty = Object.values(categorySummary).reduce((sum, value) => sum + value, 0);

  const filteredItems = useMemo(() => {
    const searchQuery = (filters.search ?? '').trim().toLowerCase();
    const locationQuery = (filters.location_code ?? '').trim().toLowerCase();
    const categoryFilter = filters.category && filters.category !== '' ? filters.category : undefined;
    const zoneFilter = filters.warehouse_zone && filters.warehouse_zone !== '' ? filters.warehouse_zone : undefined;
    const finish = finishFilter || undefined;
    const lowStockOnly = Boolean(filters.low_stock);

    return items.filter((item) => {
      if (zoneFilter && item.warehouse_zone !== zoneFilter) {
        return false;
      }

      if (categoryFilter && item.product?.category !== categoryFilter) {
        return false;
      }

      if (finish && item.product?.finish_type !== finish) {
        return false;
      }

      if (locationQuery && !item.location_code.toLowerCase().includes(locationQuery)) {
        return false;
      }

      if (searchQuery) {
        const sku = item.product?.sku?.toLowerCase() ?? '';
        const name = item.product?.name?.toLowerCase() ?? '';
        if (!sku.includes(searchQuery) && !name.includes(searchQuery)) {
          return false;
        }
      }

      if (lowStockOnly && item.quantity >= 10) {
        return false;
      }

      return true;
    });
  }, [filters, finishFilter, items]);

  const page = pagination?.page ?? filters.page ?? 1;
  const limit = pagination?.limit ?? filters.limit ?? 10;
  const total = filteredItems.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);
  const visiblePages = getVisiblePages(page, totalPages);

  const pagedItems = useMemo(
    () => filteredItems.slice((page - 1) * limit, page * limit),
    [filteredItems, limit, page],
  );

  const activeFilterCount =
    Number(Boolean(filters.warehouse_zone)) +
    Number(Boolean(filters.category)) +
    Number(Boolean(filters.search?.trim())) +
    Number(Boolean(filters.location_code?.trim())) +
    Number(Boolean(filters.low_stock)) +
    Number(Boolean(finishFilter));

  const handleOpenDrawer = useCallback((itemToView: InventoryItem) => {
    setDrawerItem(itemToView);
    setIsDrawerOpen(true);
    setScrollToMovements(false);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleItemUpdated = useCallback(
    (updatedItem: InventoryItem) => {
      setDrawerItem(updatedItem);
      void fetchItems();
    },
    [fetchItems],
  );

  const columns = useMemo<Column<InventoryItem>[]>(
    () => [
      {
        key: 'sku',
        header: 'SKU',
        render: (row) => (
          <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
            {row.product?.sku ?? '—'}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Product',
        render: (row) => (
          <div>
            <p className="text-sm font-medium text-gray-900">{row.product?.name ?? '—'}</p>
            <p className="text-xs text-gray-500">{row.product?.category ?? '—'}</p>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (row) => {
          const category = row.product?.category;
          return (
            <Badge
              label={category ? toTitleCase(category) : '—'}
              color={category ? getCategoryBadgeColor(category) : 'gray'}
            />
          );
        },
      },
      {
        key: 'warehouse_zone',
        header: 'Zone',
        render: (row) => (
          <Badge label={toTitleCase(row.warehouse_zone)} color={getZoneBadgeColor(row.warehouse_zone)} />
        ),
      },
      {
        key: 'location_code',
        header: 'Location',
        render: (row) => (
          <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
            {row.location_code}
          </span>
        ),
      },
      {
        key: 'quantity',
        header: 'Quantity',
        sortable: true,
        render: (row) => (
          <span className={row.quantity < 10 ? 'font-semibold text-red-600' : 'font-medium text-gray-900'}>
            {formatNumber(row.quantity)} {row.product?.unit ?? 'units'}
          </span>
        ),
      },
      {
        key: 'received_at',
        header: 'Received',
        render: (row) => formatDate(row.received_at),
      },
      {
        key: 'actions',
        header: '',
        width: '64px',
        render: (row) => (
          <div onClick={(event) => event.stopPropagation()}>
            <InventoryItemActions
              row={row}
              canTransfer={canModifyStock}
              canAdjust={canModifyStock}
              onViewDetails={handleOpenDrawer}
              onTransfer={(itemToTransfer) => setTransferItem(itemToTransfer)}
              onAdjust={(itemToAdjust) => {
                setAdjustItem(itemToAdjust);
                setAdjustQuantity(String(itemToAdjust.quantity));
                setAdjustReason('');
                setAdjustError(null);
              }}
              onViewMovements={(itemToView) => {
                setDrawerItem(itemToView);
                setIsDrawerOpen(true);
                setScrollToMovements(true);
              }}
            />
          </div>
        ),
      },
    ],
    [canModifyStock, handleOpenDrawer],
  );

  const handleReceiveSubmit = useCallback(
    async (payload: { product_id: string; job_id?: string; quantity: number; location_code: string; warehouse_zone: WarehouseZone }) => {
      setIsReceiveSubmitting(true);
      try {
        const success = await handleReceive(payload);
        if (success) {
          setIsReceiveOpen(false);
        }
      } finally {
        setIsReceiveSubmitting(false);
      }
    },
    [handleReceive],
  );

  const handleTransferSubmit = useCallback(
    async (payload: TransferStockDto) => {
      if (!transferItem) {
        return;
      }

      setIsTransferSubmitting(true);
      try {
        const success = await handleTransfer(transferItem.id, payload);
        if (success) {
          setTransferItem(null);
          await fetchItems();
        }
      } finally {
        setIsTransferSubmitting(false);
      }
    },
    [fetchItems, handleTransfer, transferItem],
  );

  const handleAdjustSubmit = useCallback(async () => {
    if (!adjustItem) {
      return;
    }

    const quantity = Number(adjustQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setAdjustError('Enter a valid quantity.');
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError('Reason is required.');
      return;
    }

    setIsAdjustSubmitting(true);
    setAdjustError(null);

    try {
      const success = await handleAdjust(adjustItem.id, {
        quantity,
        reason: adjustReason.trim(),
      });

      if (success) {
        setAdjustItem(null);
        await fetchItems();
      }
    } catch (submitError) {
      setAdjustError(getErrorMessage(submitError, 'Failed to adjust quantity.'));
    } finally {
      setIsAdjustSubmitting(false);
    }
  }, [adjustItem, adjustQuantity, adjustReason, fetchItems, handleAdjust]);

  const handleStocktakeComplete = useCallback(
    (result: { processed: number; flagged_count: number }) => {
      setIsStocktakeOpen(false);
      toast.success(
        `Stocktake complete: ${result.processed} processed, ${result.flagged_count} flagged`,
      );
      void fetchItems();
    },
    [fetchItems],
  );

  const emptyMessage = activeZone
    ? `No items in ${activeZone} zone`
    : 'No inventory items found';

  return (
    <section className="space-y-4">
      <PageHeader
        title="Finished Goods Inventory"
        subtitle="Track stock across all warehouse zones and locations"
        breadcrumbs={[
          { label: 'Inventory', path: '/inventory' },
        ]}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {canReceiveStock ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                onClick={() => setIsReceiveOpen(true)}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Receive Stock
              </button>
            ) : null}
            {canRunStocktake ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                onClick={() => setIsStocktakeOpen(true)}
              >
                <ClipboardCheck className="h-4 w-4" />
                Run Stocktake
              </button>
            ) : null}
          </div>
        )}
      />

      <WarehouseZoneMap
        zoneSummary={zoneSummary}
        activeZone={activeZone}
        onZoneClick={(zone) => handleFilterChange('warehouse_zone', zone)}
      />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categoryChips.map((chip) => {
          const isActive = activeCategory === chip.value;
          const totalQty = chip.value ? categorySummary[chip.value] : totalCategoryQty;

          return (
            <button
              key={chip.value || 'all'}
              type="button"
              onClick={() => handleFilterChange('category', chip.value)}
              className={
                isActive
                  ? 'inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800'
                  : 'inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200'
              }
            >
              <span>{chip.label}</span>
              <span className="text-[11px] font-semibold">{formatNumber(totalQty)}</span>
            </button>
          );
        })}
      </div>

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          setLocationValue('');
          setFinishFilter('');
          handleFilterChange('search', undefined);
          handleFilterChange('location_code', undefined);
          handleFilterChange('low_stock', undefined);
        }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by SKU or product name"
          className="h-10 w-full min-w-55 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-sm"
        />

        <input
          type="text"
          value={locationValue}
          onChange={(event) => setLocationValue(event.target.value)}
          placeholder="Location code"
          className="h-10 min-w-45 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        />

        <select
          value={finishFilter}
          onChange={(event) => {
            setFinishFilter(event.target.value);
            handlePageChange(1);
          }}
          className="h-10 min-w-45 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          {finishOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(filters.low_stock)}
            onChange={(event) =>
              handleFilterChange('low_stock', event.target.checked ? true : undefined)
            }
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          Low stock only
        </label>
      </FilterBar>

      {error ? (
        <ErrorAlert message={error} onRetry={() => void fetchItems()} />
      ) : null}

      {!isLoading && pagedItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12">
          <EmptyState
            icon={Boxes}
            title="No inventory items found"
            description={emptyMessage}
            action={canManageInventory ? {
              label: 'Receive Stock',
              onClick: () => setIsReceiveOpen(true),
              icon: ArrowDownCircle,
            } : undefined}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={pagedItems}
          isLoading={isLoading}
          emptyMessage="No inventory items found for the selected filters."
          onRowClick={handleOpenDrawer}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="text-sm text-gray-600">
          Showing {startItem} to {endItem} of {total} results
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            Previous
          </button>

          {visiblePages.map((pageNumber) => (
            <button
              key={`inventory-page-${pageNumber}`}
              type="button"
              className={
                pageNumber === page
                  ? 'rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white'
                  : 'rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100'
              }
              onClick={() => handlePageChange(pageNumber)}
              disabled={isLoading}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </button>
        </div>
      </div>

      <InventoryItemDrawer
        item={drawerItem}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onItemUpdated={handleItemUpdated}
      />

      <Modal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} title="Receive Stock" size="lg">
        <ReceiveStockForm
          onSubmit={handleReceiveSubmit}
          onCancel={() => setIsReceiveOpen(false)}
          isSubmitting={isReceiveSubmitting}
          productsForSelect={productsForSelect}
          productionJobsForSelect={productionJobsForSelect}
        />
      </Modal>

      <Modal isOpen={isStocktakeOpen} onClose={() => setIsStocktakeOpen(false)} title="Stocktake" size="xl">
        <StocktakeWizard
          items={items}
          onComplete={handleStocktakeComplete}
          onCancel={() => setIsStocktakeOpen(false)}
        />
      </Modal>

      <Modal isOpen={isMovementLogOpen} onClose={() => setIsMovementLogOpen(false)} title="Movement Log" size="xl">
        <StockMovementLog showFilters />
      </Modal>

      <Modal
        isOpen={Boolean(transferItem)}
        onClose={() => setTransferItem(null)}
        title="Transfer Stock"
        size="md"
      >
        {transferItem ? (
          <TransferStockForm
            item={transferItem}
            onSubmit={handleTransferSubmit}
            onCancel={() => setTransferItem(null)}
            isSubmitting={isTransferSubmitting}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(adjustItem)}
        onClose={() => setAdjustItem(null)}
        title="Adjust Quantity"
        size="sm"
      >
        {adjustItem ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">New Quantity</label>
              <input
                type="number"
                step="any"
                value={adjustQuantity}
                onChange={(event) => setAdjustQuantity(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Reason</label>
              <textarea
                rows={2}
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
              />
            </div>

            {adjustError ? (
              <p className="text-xs font-semibold text-red-600">{adjustError}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustSubmit}
                disabled={isAdjustSubmitting}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAdjustSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
