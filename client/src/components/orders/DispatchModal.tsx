import { Loader2, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DispatchOrderDto } from '../../types/sales.types';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  lineCount: number;
  onDispatch: (dto: DispatchOrderDto) => void | Promise<void>;
  isUpdating: boolean;
}

function getTodayValue(): string {
  return new Date().toISOString().split('T')[0];
}

export default function DispatchModal({
  isOpen,
  onClose,
  orderId,
  lineCount,
  onDispatch,
  isUpdating,
}: DispatchModalProps) {
  const [dispatchDate, setDispatchDate] = useState(getTodayValue());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDispatchDate(getTodayValue());
      setNotes('');
    }
  }, [isOpen]);

  const title = useMemo(() => `Dispatch Order #${orderId.slice(0, 8)}`, [orderId]);

  const handleConfirm = async () => {
    if (isSubmitting || isUpdating) {
      return;
    }

    setIsSubmitting(true);

    const payload: DispatchOrderDto = {
      dispatch_date: dispatchDate || undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    try {
      await onDispatch(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Dispatch Date" required>
            <input
              type="date"
              value={dispatchDate}
              onChange={(event) => setDispatchDate(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/50"
              disabled={isUpdating || isSubmitting}
            />
          </FormField>

          <FormField label="Notes" hint="Add any dispatch notes or tracking info">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any dispatch notes or tracking info"
              className="min-h-[88px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/50"
              disabled={isUpdating || isSubmitting}
            />
          </FormField>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold">Summary</p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-700">
            <li>{lineCount} line items will be dispatched</li>
            <li>Stock will be deducted from inventory</li>
            <li>Order status will change to Dispatched</li>
          </ul>
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
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isUpdating || isSubmitting}
          >
            {isUpdating || isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4" />
            )}
            Dispatch Now
          </button>
        </div>
      </div>
    </Modal>
  );
}
