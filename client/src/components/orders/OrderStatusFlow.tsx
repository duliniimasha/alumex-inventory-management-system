import clsx from 'clsx';
import {
  Check,
  CheckCircle,
  Clock,
  Loader2,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  DispatchOrderDto,
  OrderLine,
  OrderStatus,
  ReturnOrderDto,
  SalesOrder,
} from '../../types/sales.types';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import DispatchModal from './DispatchModal';
import ReturnModal from './ReturnModal';

interface OrderStatusFlowProps {
  order: SalesOrder;
  onDispatch: (dto: DispatchOrderDto) => void | Promise<void>;
  onCancel: (reason: string) => void | Promise<void>;
  onReturn: (dto: ReturnOrderDto) => void | Promise<void>;
  isUpdating: boolean;
  canDispatch: boolean;
  canCancel: boolean;
  orderLines: OrderLine[];
  initialAction?: 'dispatch' | 'cancel' | 'return' | null;
  actionToken?: number;
}

type StepKey = 'pending' | 'confirmed' | 'picking' | 'dispatched' | 'delivered';

type StepTone = {
  active: string;
  ring: string;
  label: string;
  connector: string;
};

type StepConfig = {
  key: StepKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: StepTone;
};

const mainSteps: StepConfig[] = [
  {
    key: 'pending',
    label: 'Pending',
    icon: Clock,
    tone: {
      active: 'bg-slate-200 text-slate-600',
      ring: 'ring-slate-300',
      label: 'text-slate-600',
      connector: 'bg-slate-300',
    },
  },
  {
    key: 'confirmed',
    label: 'Confirmed',
    icon: CheckCircle,
    tone: {
      active: 'bg-blue-500 text-white',
      ring: 'ring-blue-300',
      label: 'text-blue-600',
      connector: 'bg-blue-400',
    },
  },
  {
    key: 'picking',
    label: 'Picking',
    icon: PackageOpen,
    tone: {
      active: 'bg-amber-500 text-white',
      ring: 'ring-amber-300',
      label: 'text-amber-600',
      connector: 'bg-amber-400',
    },
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: Truck,
    tone: {
      active: 'bg-emerald-500 text-white',
      ring: 'ring-emerald-300',
      label: 'text-emerald-600',
      connector: 'bg-emerald-400',
    },
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: PackageCheck,
    tone: {
      active: 'bg-emerald-500 text-white',
      ring: 'ring-emerald-300',
      label: 'text-emerald-600',
      connector: 'bg-emerald-400',
    },
  },
];

const futureStepClasses = 'bg-slate-100 text-slate-400';

function getMainIndex(status: OrderStatus): number {
  if (status === 'cancelled') {
    return -1;
  }

  if (status === 'returned') {
    return mainSteps.findIndex((step) => step.key === 'dispatched');
  }

  return mainSteps.findIndex((step) => step.key === status);
}

function StepNode({
  step,
  isComplete,
  isCurrent,
  isFuture,
  number,
}: {
  step: StepConfig;
  isComplete: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  number: number;
}) {
  const Icon = step.icon;
  const showCheck = isComplete;

  const circleClasses = clsx(
    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors',
    {
      [step.tone.active]: isComplete || isCurrent,
      [futureStepClasses]: isFuture,
      'ring-2 ring-offset-2': isCurrent,
      [step.tone.ring]: isCurrent,
    },
  );

  const labelClasses = clsx('text-xs font-semibold', {
    [step.tone.label]: !isFuture,
    'text-slate-400': isFuture,
  });

  return (
    <div className="flex items-center gap-4 md:flex-col md:items-center md:gap-2">
      <div className={circleClasses} aria-hidden="true">
        {showCheck ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <span className={labelClasses}>{step.label}</span>
      <span className="sr-only">Step {number}</span>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  tone,
  variant = 'solid',
  disabled,
  isLoading,
  hint,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  tone: 'blue' | 'green' | 'red' | 'orange' | 'gray';
  variant?: 'solid' | 'outline';
  disabled: boolean;
  isLoading: boolean;
  hint?: string;
}) {
  const classes = clsx(
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
    {
      'bg-blue-600 text-white hover:bg-blue-700': tone === 'blue' && variant === 'solid',
      'bg-emerald-600 text-white hover:bg-emerald-700': tone === 'green' && variant === 'solid',
      'bg-slate-600 text-white hover:bg-slate-700': tone === 'gray' && variant === 'solid',
      'border border-red-200 text-red-600 hover:bg-red-50': tone === 'red' && variant === 'outline',
      'border border-orange-200 text-orange-600 hover:bg-orange-50': tone === 'orange' && variant === 'outline',
      'border border-gray-200 text-gray-600 hover:bg-gray-50': tone === 'gray' && variant === 'outline',
      'cursor-not-allowed opacity-60': disabled || isLoading,
    },
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled || isLoading}
        title={disabled && hint ? hint : undefined}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {label}
      </button>
      {disabled && hint ? (
        <span className="text-xs text-amber-700">{hint}</span>
      ) : null}
    </div>
  );
}

export default function OrderStatusFlow({
  order,
  onDispatch,
  onCancel,
  onReturn,
  isUpdating,
  canDispatch,
  canCancel,
  orderLines,
  initialAction = null,
  actionToken,
}: OrderStatusFlowProps) {
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const status = order.status;
  const isCancelled = status === 'cancelled';
  const isReturned = status === 'returned';

  const currentIndex = useMemo(() => getMainIndex(status), [status]);

  useEffect(() => {
    if (!isCancelOpen) {
      setCancelReason('');
      setCancelError(null);
    }
  }, [isCancelOpen]);

  const statusCounts = useMemo(() => {
    return mainSteps.map((_, index) => {
      if (currentIndex === -1) {
        return { isComplete: false, isCurrent: false, isFuture: true };
      }

      const isCurrent = index === currentIndex && !isReturned;
      const isComplete = index < currentIndex || (isReturned && index === currentIndex);
      const isFuture = !isComplete && !isCurrent;

      return { isComplete, isCurrent, isFuture };
    });
  }, [currentIndex, isReturned]);

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Reason is required.');
      return;
    }

    await onCancel(cancelReason.trim());
    setIsCancelOpen(false);
  };

  const showDispatchActions = status === 'pending' || status === 'confirmed' || status === 'picking';
  const showReturnActions = status === 'dispatched';
  const showCancelActions = status === 'pending' || showDispatchActions;

  useEffect(() => {
    if (!initialAction || !actionToken) {
      return;
    }

    if (initialAction === 'dispatch' && showDispatchActions && canDispatch) {
      setIsDispatchOpen(true);
    }

    if (initialAction === 'cancel' && showCancelActions && canCancel) {
      setIsCancelOpen(true);
    }

    if (initialAction === 'return' && showReturnActions) {
      setIsReturnOpen(true);
    }
  }, [actionToken, canCancel, canDispatch, initialAction, showDispatchActions, showReturnActions]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {mainSteps.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center md:flex-row md:items-center">
                <StepNode
                  step={step}
                  number={index + 1}
                  isComplete={statusCounts[index].isComplete}
                  isCurrent={statusCounts[index].isCurrent}
                  isFuture={statusCounts[index].isFuture}
                />
                {index < mainSteps.length - 1 ? (
                  <div
                    className={clsx(
                      'my-4 h-8 w-0.5 md:my-0 md:mx-4 md:h-0.5 md:w-14',
                      statusCounts[index].isComplete || statusCounts[index].isCurrent
                        ? mainSteps[index].tone.connector
                        : 'bg-slate-200',
                    )}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {isCancelled ? (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="font-semibold">Cancelled</span>
              </div>
            ) : null}
            {isReturned ? (
              <div className="flex items-center gap-2 text-orange-600">
                <RotateCcw className="h-4 w-4" />
                <span className="font-semibold">Returned</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {showDispatchActions && canDispatch ? (
              <ActionButton
                label={status === 'pending' ? 'Confirm Order' : 'Dispatch Order'}
                icon={status === 'pending' ? CheckCircle : Truck}
                tone={status === 'pending' ? 'blue' : 'green'}
                onClick={() => setIsDispatchOpen(true)}
                disabled={isUpdating}
                isLoading={false}
              />
            ) : null}

            {showCancelActions && canCancel ? (
              <ActionButton
                label="Cancel Order"
                icon={XCircle}
                tone="red"
                variant="outline"
                onClick={() => setIsCancelOpen(true)}
                disabled={isUpdating}
                isLoading={false}
              />
            ) : null}

            {showReturnActions ? (
              <>
                <ActionButton
                  label="Mark as Delivered"
                  icon={PackageCheck}
                  tone="gray"
                  onClick={() => undefined}
                  disabled
                  isLoading={false}
                />
                <ActionButton
                  label="Process Return"
                  icon={RotateCcw}
                  tone="orange"
                  variant="outline"
                  onClick={() => setIsReturnOpen(true)}
                  disabled={isUpdating}
                  isLoading={false}
                />
              </>
            ) : null}

            {!showDispatchActions && !showReturnActions && status !== 'pending' ? (
              <span className="text-xs text-slate-500">No available actions</span>
            ) : null}
          </div>
        </div>
      </div>

      <DispatchModal
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        orderId={order.id}
        lineCount={orderLines.length}
        onDispatch={onDispatch}
        isUpdating={isUpdating}
      />

      <ReturnModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        orderLines={orderLines}
        onReturn={onReturn}
        isUpdating={isUpdating}
      />

      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Order"
        size="sm"
      >
        <div className="space-y-4">
          <FormField label="Reason" required error={cancelError ?? undefined}>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError(null);
              }}
              placeholder="Provide a cancellation reason"
              className="min-h-22 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-400/50"
              disabled={isUpdating}
            />
          </FormField>

          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            Cancelled orders release reserved stock back into inventory.
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCancelOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={isUpdating}
            >
              Keep Order
            </button>
            <button
              type="button"
              onClick={handleCancelConfirm}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isUpdating}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel Order
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
