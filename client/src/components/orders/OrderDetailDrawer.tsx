import clsx from 'clsx';
import { Globe, Printer, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useOrderDetail } from '../../hooks/useOrderDetail';
import { useOrders } from '../../hooks/useOrders';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import type { OrderChannel, OrderStatus, SalesOrder } from '../../types/sales.types';
import { formatDateTime, formatNumber, toTitleCase } from '../../utils/formatters';
import Badge from '../ui/Badge';
import OrderLineManager from './OrderLineManager';
import OrderStatusFlow from './OrderStatusFlow';

interface OrderDetailDrawerProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (order: SalesOrder) => void;
  initialAction?: 'dispatch' | 'cancel' | 'return' | 'edit-lines' | null;
  actionToken?: number;
}

type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple';

type ChannelConfig = {
  label: string;
  color: BadgeColor;
  icon?: React.ComponentType<{ className?: string }>;
};

type StatusConfig = {
  label: string;
  color: BadgeColor;
  tone: string;
};

const channelConfig: Record<OrderChannel, ChannelConfig> = {
  local: { label: 'Local', color: 'gray' },
  alumex_store: { label: 'Alumex Store', color: 'blue' },
  export: { label: 'Export', color: 'purple', icon: Globe },
};

const statusConfig: Record<OrderStatus, StatusConfig> = {
  pending: { label: 'Pending', color: 'gray', tone: 'bg-slate-100 text-slate-700' },
  confirmed: { label: 'Confirmed', color: 'blue', tone: 'bg-blue-100 text-blue-700' },
  picking: { label: 'Picking', color: 'amber', tone: 'bg-amber-100 text-amber-700' },
  dispatched: { label: 'Dispatched', color: 'green', tone: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Delivered', color: 'green', tone: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'red', tone: 'bg-red-100 text-red-700' },
  returned: { label: 'Returned', color: 'amber', tone: 'bg-orange-100 text-orange-700' },
};

const typeColorByValue: Record<NonNullable<SalesOrder['customer']>['type'], BadgeColor> = {
  b2b: 'blue',
  fabricator: 'purple',
  retail: 'amber',
  export: 'green',
  government: 'gray',
};

const printStyles = `@media print {
  body > *:not(.print-target) { display: none; }
  .print-target { position: static !important; inset: auto !important; background: white !important; }
  .print-target .print-hidden { display: none !important; }
}`;

export default function OrderDetailDrawer({
  orderId,
  isOpen,
  onClose,
  onOrderUpdated,
  initialAction = null,
  actionToken,
}: OrderDetailDrawerProps) {
  const navigate = useNavigate();
  const { canDispatch: canDispatchRole, canCreateOrders, isReadOnly } = useRoleAccess();
  const { productsForSelect, handleDispatch, handleCancel, handleReturn } = useOrders();

  const {
    order,
    isLoading,
    error,
    isUpdating,
    orderTotal,
    totalItems,
    isEditable,
    fetchOrder,
  } = useOrderDetail(orderId);

  const [isVisible, setIsVisible] = useState(false);
  const [isActionUpdating, setIsActionUpdating] = useState(false);
  const linesSectionRef = useRef<HTMLDivElement>(null);

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
    if (!isOpen || initialAction !== 'edit-lines' || !actionToken) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      linesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [actionToken, initialAction, isOpen]);

  useEffect(() => {
    if (order) {
      onOrderUpdated(order);
    }
  }, [onOrderUpdated, order]);

  const isBusy = isUpdating || isActionUpdating;
  const canEdit = canCreateOrders && !isReadOnly;
  const canCancel = canCreateOrders && !isReadOnly;

  const handleDispatchSubmit = useCallback(
    async (dto: Parameters<typeof handleDispatch>[1]) => {
      if (!orderId) {
        return;
      }

      setIsActionUpdating(true);

      try {
        const didDispatch = await handleDispatch(orderId, dto);
        if (didDispatch) {
          await fetchOrder();
        }
      } finally {
        setIsActionUpdating(false);
      }
    },
    [fetchOrder, handleDispatch, orderId],
  );

  const handleCancelSubmit = useCallback(
    async (reason: string) => {
      if (!orderId) {
        return;
      }

      setIsActionUpdating(true);

      try {
        const didCancel = await handleCancel(orderId, reason);
        if (didCancel) {
          await fetchOrder();
        }
      } finally {
        setIsActionUpdating(false);
      }
    },
    [fetchOrder, handleCancel, orderId],
  );

  const handleReturnSubmit = useCallback(
    async (dto: Parameters<typeof handleReturn>[1]) => {
      if (!orderId) {
        return;
      }

      setIsActionUpdating(true);

      try {
        const didReturn = await handleReturn(orderId, dto);
        if (didReturn) {
          await fetchOrder();
        }
      } finally {
        setIsActionUpdating(false);
      }
    },
    [fetchOrder, handleReturn, orderId],
  );

  const headerId = order ? `#ORD-${order.id.slice(0, 8).toUpperCase()}` : '#ORD-';
  const channel = order ? channelConfig[order.channel] : null;
  const ChannelIcon = channel?.icon;
  const status = order ? statusConfig[order.status] : null;
  const orderLines = order?.order_lines ?? [];

  const dispatchAt = order?.dispatch_date ? formatDateTime(order.dispatch_date) : null;
  const orderDate = order?.order_date ? formatDateTime(order.order_date) : 'Not available';

  const ownerLabel = order?.owner?.name ?? 'Unassigned';
  const ownerRole = order?.owner?.role ? toTitleCase(order.owner.role) : 'Unknown role';

  const timelineEntries = useMemo(() => {
    const entries: { label: string; date: string }[] = [];

    if (order?.created_at) {
      entries.push({ label: 'Order created', date: formatDateTime(order.created_at) });
    }

    if (order?.dispatch_date) {
      entries.push({ label: 'Dispatched', date: formatDateTime(order.dispatch_date) });
    }

    return entries;
  }, [order?.created_at, order?.dispatch_date]);

  if (!isOpen) {
    return null;
  }

  const drawer = (
    <div
      className={clsx(
        'print-target fixed inset-0 z-50 flex justify-end transition-opacity duration-300',
        isVisible ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0',
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <style>{printStyles}</style>
      <aside
        className={clsx(
          'flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ maxWidth: 680 }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold text-gray-500">Sales Order</p>
            <p className="font-mono text-sm text-gray-800">{headerId}</p>
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
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading order details...
            </div>
          ) : !order ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select an order to view details.
            </div>
          ) : (
            <div className="space-y-6">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <section className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {channel ? (
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                            channel.color === 'gray' && 'bg-gray-100 text-gray-600',
                            channel.color === 'blue' && 'bg-blue-100 text-blue-700',
                            channel.color === 'purple' && 'bg-purple-100 text-purple-700',
                          )}
                        >
                          {ChannelIcon ? <ChannelIcon className="h-3.5 w-3.5" /> : null}
                          {channel.label}
                        </span>
                      ) : null}
                      {status ? (
                        <span className={clsx('inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold', status.tone)}>
                          {status.label}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Order date: {orderDate}</span>
                      {dispatchAt ? <span>Dispatch date: {dispatchAt}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Customer</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {order.customer?.name ?? 'Unknown customer'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        label={order.customer ? toTitleCase(order.customer.type) : 'Unknown'}
                        color={order.customer ? typeColorByValue[order.customer.type] : 'gray'}
                      />
                      <span className="text-xs text-gray-500">
                        {order.customer?.country ?? 'Unknown country'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">Contact</p>
                    <p className="mt-1 text-sm text-gray-800">{order.customer?.contact_email ?? 'No email'}</p>
                    <p className="text-sm text-gray-800">{order.customer?.contact_phone ?? 'No phone'}</p>
                    <button
                      type="button"
                      onClick={() => navigate('/customers', { state: { customerId: order.customer_id } })}
                      className="mt-2 text-xs font-semibold text-amber-600 underline decoration-amber-400 underline-offset-2"
                    >
                      View Customer
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                    {formatNumber(totalItems, 0)} Items
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                    {orderLines.length} Lines
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                    LKR {formatNumber(orderTotal, 2)} Total
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                    Created by: {ownerLabel} ({ownerRole})
                  </span>
                </div>
              </section>

              <OrderStatusFlow
                order={order}
                onDispatch={handleDispatchSubmit}
                onCancel={handleCancelSubmit}
                onReturn={handleReturnSubmit}
                isUpdating={isBusy}
                canDispatch={canDispatchRole}
                canCancel={canCancel}
                orderLines={orderLines}
                initialAction={initialAction === 'edit-lines' ? null : initialAction}
                actionToken={actionToken}
              />

              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                <div className="h-px flex-1 bg-gray-200" />
                <span>Order Lines</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div ref={linesSectionRef}>
                <OrderLineManager
                  orderId={order.id}
                  isEditable={isEditable}
                  canEdit={canEdit}
                  productsForSelect={productsForSelect}
                />
              </div>

              {order.channel === 'export' ? (
                <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Export Order - Customs documentation required
                  </p>
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-700">Shipping Reference</p>
                      <p className="mt-1 font-semibold text-gray-800">Not set</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-700">Customs Ref</p>
                      <p className="mt-1 font-semibold text-gray-800">Not set</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-700">Port of Departure</p>
                      <p className="mt-1 font-semibold text-gray-800">Not set</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700">Document generation coming soon.</p>
                </section>
              ) : null}

              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                <div className="h-px flex-1 bg-gray-200" />
                <span>Order Timeline</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-3">
                {timelineEntries.length === 0 ? (
                  <p className="text-sm text-gray-500">No timeline updates available.</p>
                ) : (
                  timelineEntries.map((entry) => (
                    <div key={entry.label} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 h-2 w-2 rounded-full bg-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-800">{entry.label}</p>
                        <p className="text-xs text-gray-500">{entry.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="print-hidden sticky bottom-0 border-t border-gray-100 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" />
              Print Order
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
