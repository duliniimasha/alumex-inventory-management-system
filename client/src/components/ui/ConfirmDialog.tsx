import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

type ConfirmVariant = 'danger' | 'warning' | 'default';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: ConfirmVariant;
}

const iconByVariant = {
  danger: Trash2,
  warning: AlertTriangle,
  default: AlertTriangle,
} as const;

const iconToneByVariant: Record<ConfirmVariant, string> = {
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-amber-100 text-amber-600',
  default: 'bg-gray-100 text-gray-600',
};

const confirmButtonToneByVariant: Record<ConfirmVariant, string> = {
  danger: 'bg-red-600 text-white hover:bg-red-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  default: 'bg-gray-700 text-white hover:bg-gray-800',
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  const Icon = iconByVariant[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="mx-auto max-w-[420px]">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${iconToneByVariant[variant]}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>

          <p className="pt-1 text-sm text-gray-600">{message}</p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${confirmButtonToneByVariant[variant]}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}