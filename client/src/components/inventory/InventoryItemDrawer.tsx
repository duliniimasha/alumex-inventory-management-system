import clsx from 'clsx';
import {
  ArrowLeftRight,
  Factory,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInventoryItemById } from '../../api/inventory.api';
import { useInventory } from '../../hooks/useInventory';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import type { InventoryItem, TransferStockDto } from '../../types/inventory.types';
import { formatDateTime, toTitleCase } from '../../utils/formatters';
import { getCategoryBadgeColor, getZoneBadgeColor } from '../../utils/inventory.utils';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import StockMovementLog from './StockMovementLog';
import TransferStockForm from './TransferStockForm';

interface InventoryItemDrawerProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: (item: InventoryItem) => void;
}

export default function InventoryItemDrawer({
  item,
  isOpen,
  onClose,
  onItemUpdated,
}: InventoryItemDrawerProps) {
  const navigate = useNavigate();
  const { canManageInventory } = useRoleAccess();
  const { handleAdjust, handleTransfer } = useInventory();

  const [isVisible, setIsVisible] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isTransferSubmitting, setIsTransferSubmitting] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (item) {
      setAdjustQuantity(String(item.quantity));
    } else {
      setAdjustQuantity('');
    }

    setAdjustReason('');
    setAdjustError(null);
    setIsAdjustOpen(false);
  }, [item]);

  const product = item?.product;
  const unitLabel = product?.unit ?? 'units';
  const finishType = product?.finish_type ? toTitleCase(product.finish_type) : '—';
  const lengthValue = product?.length_mm ? `${product.length_mm} mm` : '—';
  const receivedAt = item?.received_at ? formatDateTime(item.received_at) : '—';

  const categoryTone = product?.category
    ? getCategoryBadgeColor(product.category)
    : 'gray';
  const zoneTone = item?.warehouse_zone
    ? getZoneBadgeColor(item.warehouse_zone)
    : 'gray';

  const details = useMemo(
    () => [
      { label: 'Location Code', value: item?.location_code ? (
        <span className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs text-gray-700">
          {item.location_code}
        </span>
      ) : '—' },
      { label: 'Quantity', value: (
        <span className="text-xl font-bold text-gray-900">
          {item ? item.quantity : '—'} {unitLabel}
        </span>
      ) },
      { label: 'Warehouse Zone', value: item?.warehouse_zone ? toTitleCase(item.warehouse_zone) : '—' },
      { label: 'Unit', value: unitLabel },
      { label: 'Finish Type', value: finishType },
      { label: 'Length', value: lengthValue },
      { label: 'Received At', value: receivedAt },
      { label: 'Linked Job', value: item?.job_id ? (
        <button
          type="button"
          className="text-sm font-semibold text-amber-700 underline decoration-amber-400 underline-offset-2"
          onClick={() => navigate('/production', { state: { openJobId: item.job_id } })}
        >
          {item.job_id}
        </button>
      ) : '—' },
    ],
    [finishType, item, lengthValue, navigate, receivedAt, unitLabel],
  );

  const canSubmitAdjust = useMemo(() => {
    const quantity = Number(adjustQuantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      return false;
    }

    if (!adjustReason.trim()) {
      return false;
    }

    return true;
  }, [adjustQuantity, adjustReason]);

  const fetchAndUpdateItem = useCallback(async () => {
    if (!item) {
      return;
    }

    const response = await getInventoryItemById(item.id);
    const { movements: _movements, ...updatedItem } = response;
    onItemUpdated(updatedItem);
  }, [item, onItemUpdated]);

  const handleTransferSubmit = useCallback(
    async (dto: TransferStockDto) => {
      if (!item) {
        return;
      }

      setIsTransferSubmitting(true);

      try {
        const success = await handleTransfer(item.id, dto);

        if (success) {
          await fetchAndUpdateItem();
          setIsTransferOpen(false);
        }
      } finally {
        setIsTransferSubmitting(false);
      }
    },
    [fetchAndUpdateItem, handleTransfer, item],
  );

  const handleAdjustSubmit = useCallback(async () => {
    if (!item) {
      return;
    }

    setAdjustError(null);

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

    try {
      const success = await handleAdjust(item.id, {
        quantity,
        reason: adjustReason.trim(),
      });

      if (success) {
        await fetchAndUpdateItem();
        setIsAdjustOpen(false);
      }
    } finally {
      setIsAdjustSubmitting(false);
    }
  }, [adjustQuantity, adjustReason, fetchAndUpdateItem, handleAdjust, item]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex justify-end transition-opacity duration-300',
        isVisible ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0',
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        className={clsx(
          'flex h-full w-full max-w-130 flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        )}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Inventory Item</p>
            <p className="text-xs text-gray-500">Details & movement history</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!item ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select an inventory item to view details.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3">
                <div>
                  <p className="text-xs font-mono text-gray-500">{product?.sku ?? 'UNKNOWN-SKU'}</p>
                  <p className="text-lg font-semibold text-gray-900">{product?.name ?? 'Unknown Product'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {product?.category ? (
                    <Badge label={toTitleCase(product.category)} color={categoryTone} />
                  ) : null}
                  {item.warehouse_zone ? (
                    <Badge label={toTitleCase(item.warehouse_zone)} color={zoneTone} />
                  ) : null}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm md:grid-cols-2">
                {details.map((detail) => (
                  <div key={detail.label}>
                    <p className="text-xs text-gray-500">{detail.label}</p>
                    <div className="mt-1 font-medium text-gray-900">{detail.value}</div>
                  </div>
                ))}
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {canManageInventory ? (
                    <button
                      type="button"
                      onClick={() => setIsTransferOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Transfer
                    </button>
                  ) : null}

                  {canManageInventory ? (
                    <button
                      type="button"
                      onClick={() => setIsAdjustOpen((previous) => !previous)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Adjust Quantity
                    </button>
                  ) : null}

                  {item.job_id ? (
                    <button
                      type="button"
                      onClick={() => navigate('/production', { state: { openJobId: item.job_id } })}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <Factory className="h-4 w-4" />
                      View Production Job
                    </button>
                  ) : null}
                </div>

                {isAdjustOpen ? (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600">New Quantity</label>
                        <input
                          type="number"
                          step="any"
                          value={adjustQuantity}
                          onChange={(event) => setAdjustQuantity(event.target.value)}
                          className="mt-1 h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">Reason</label>
                        <textarea
                          rows={2}
                          value={adjustReason}
                          onChange={(event) => setAdjustReason(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                        />
                      </div>
                    </div>

                    {adjustError ? (
                      <p className="text-xs font-semibold text-red-600">{adjustError}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAdjustOpen(false)}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!canSubmitAdjust || isAdjustSubmitting}
                        onClick={handleAdjustSubmit}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isAdjustSubmitting ? 'Saving...' : 'Save Adjustment'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <div
                id="inventory-movement-history"
                className="flex items-center gap-3 scroll-mt-6 text-xs font-semibold text-gray-500"
              >
                <div className="h-px flex-1 bg-gray-200" />
                <span>Movement History</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <StockMovementLog itemId={item.id} showFilters={false} maxHeight="350px" />
            </div>
          )}
        </div>
      </aside>

      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Inventory"
        size="md"
      >
        {item ? (
          <TransferStockForm
            item={item}
            onSubmit={handleTransferSubmit}
            onCancel={() => setIsTransferOpen(false)}
            isSubmitting={isTransferSubmitting}
          />
        ) : null}
      </Modal>
    </div>
  );
}
