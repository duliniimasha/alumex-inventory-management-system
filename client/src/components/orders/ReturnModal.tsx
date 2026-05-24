import { Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { OrderLine, ReturnOrderDto, ReturnReason } from '../../types/sales.types';
import { formatNumber } from '../../utils/formatters';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderLines: OrderLine[];
  onReturn: (dto: ReturnOrderDto) => void | Promise<void>;
  isUpdating: boolean;
}

const returnReasonOptions: { value: ReturnReason; label: string }[] = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'order_cancelled', label: 'Order Cancelled' },
  { value: 'other', label: 'Other' },
];

function getProductLabel(line: OrderLine): string {
  if (line.product?.name && line.product?.sku) {
    return `${line.product.sku} - ${line.product.name}`;
  }

  return line.product?.name ?? line.product_id;
}

export default function ReturnModal({
  isOpen,
  onClose,
  orderLines,
  onReturn,
  isUpdating,
}: ReturnModalProps) {
  const dispatchedLines = useMemo(
    () => orderLines.filter((line) => line.qty_dispatched > 0),
    [orderLines],
  );

  const [reason, setReason] = useState<ReturnReason>('damaged');
  const [notes, setNotes] = useState('');
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialQty: Record<string, number> = {};
    dispatchedLines.forEach((line) => {
      initialQty[line.id] = 0;
    });

    setReturnQty(initialQty);
    setReason('damaged');
    setNotes('');
    setError(null);
  }, [dispatchedLines, isOpen]);

  const totalReturned = useMemo(() => {
    return Object.values(returnQty).reduce((sum, qty) => sum + qty, 0);
  }, [returnQty]);

  const handleConfirm = async () => {
    if (isSubmitting || isUpdating) {
      return;
    }

    const lines = dispatchedLines
      .map((line) => ({
        line_id: line.id,
        qty_returned: returnQty[line.id] ?? 0,
      }))
      .filter((line) => line.qty_returned > 0);

    if (lines.length === 0) {
      setError('Select at least one line to return.');
      return;
    }

    setIsSubmitting(true);

    const payload: ReturnOrderDto = {
      reason,
      notes: notes.trim() ? notes.trim() : undefined,
      lines,
    };

    try {
      await onReturn(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Return" size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Reason" required>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReturnReason)}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-400/50"
              disabled={isUpdating || isSubmitting}
            >
              {returnReasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Notes" hint="Optional return details">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add notes about the return"
              className="min-h-[88px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-400/50"
              disabled={isUpdating || isSubmitting}
            />
          </FormField>
        </div>

        <div className="rounded-lg border border-gray-200">
          <div className="grid grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span className="col-span-6">Product</span>
            <span className="col-span-3">Dispatched Qty</span>
            <span className="col-span-3 text-right">Return Qty</span>
          </div>

          {dispatchedLines.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">
              No dispatched items available to return.
            </div>
          ) : (
            dispatchedLines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-12 items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0"
              >
                <div className="col-span-6">
                  <p className="text-sm font-semibold text-gray-900">{getProductLabel(line)}</p>
                </div>
                <div className="col-span-3 text-gray-600">
                  {formatNumber(line.qty_dispatched, 0)}
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <input
                    type="number"
                    min={0}
                    max={line.qty_dispatched}
                    value={returnQty[line.id] ?? 0}
                    onChange={(event) => {
                      const nextValue = Math.min(
                        Math.max(Number(event.target.value), 0),
                        line.qty_dispatched,
                      );
                      setReturnQty((prev) => ({ ...prev, [line.id]: nextValue }));
                      setError(null);
                    }}
                    className="h-9 w-20 rounded-lg border border-gray-300 px-2 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-400/50"
                    disabled={isUpdating || isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReturnQty((prev) => ({ ...prev, [line.id]: line.qty_dispatched }));
                      setError(null);
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                    disabled={isUpdating || isSubmitting}
                  >
                    Return all
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

        <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Returning {formatNumber(totalReturned, 0)} items - stock will be restored
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            disabled={isUpdating || isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isUpdating || isSubmitting || dispatchedLines.length === 0}
          >
            {isUpdating || isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Process Return
          </button>
        </div>
      </div>
    </Modal>
  );
}
