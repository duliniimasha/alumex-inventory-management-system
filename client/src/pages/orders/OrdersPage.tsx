import clsx from 'clsx';
import {
  CheckCircle,
  DollarSign,
  Eye,
  Globe,
  MoreVertical,
  Package,
  Plus,
  Truck,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Badge from '../../components/ui/Badge';
import DataTable, { type Column } from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import CreateOrderForm from '../../components/orders/CreateOrderForm';
import OrderDetailDrawer from '../../components/orders/OrderDetailDrawer';
import OrderStatusBar from '../../components/orders/OrderStatusBar';
import { useClickOutside, useDebounce, useOrders, usePageTitle, useRoleAccess } from '../../hooks';
import type { OrderChannel, OrderStatus, SalesOrder } from '../../types/sales.types';
import { formatDate, formatNumber } from '../../utils/formatters';
import {
  formatCurrency,
  formatOrderId,
  getChannelBadgeColor,
  getOrderStatusBadgeColor,
} from '../../utils/sales.utils';

type DrawerAction = 'dispatch' | 'cancel' | 'return' | 'edit-lines' | null;

type ChannelTab = {
  label: string;
  value: OrderChannel | '';
  icon?: React.ComponentType<{ className?: string }>;
};

const channelTabs: ChannelTab[] = [
  { label: 'All Channels', value: '' },
  { label: 'Local', value: 'local' },
  { label: 'Alumex Store', value: 'alumex_store' },
  { label: 'Export', value: 'export', icon: Globe },
];

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  picking: 'Picking',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

function getJobStatusLabel(status: OrderStatus): string {
  return statusLabels[status] ?? 'Unknown';
}

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

function OrderActions({
  order,
  canDispatch,
  canCancel,
  canEdit,
  onView,
  onDispatch,
  onCancel,
  onReturn,
  onEditLines,
}: {
  order: SalesOrder;
  canDispatch: boolean;
  canCancel: boolean;
  canEdit: boolean;
  onView: (order: SalesOrder) => void;
  onDispatch: (order: SalesOrder) => void;
  onCancel: (order: SalesOrder) => void;
  onReturn: (order: SalesOrder) => void;
  onEditLines: (order: SalesOrder) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  const canDispatchOrder =
    (order.status === 'confirmed' || order.status === 'picking') && canDispatch;
  const canCancelOrder =
    (order.status === 'pending' || order.status === 'confirmed' || order.status === 'picking') && canCancel;
  const canReturnOrder = order.status === 'dispatched';
  const canEditLines = order.status === 'pending' && canEdit;

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Order actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onView(order))}
          >
            <Eye className="h-4 w-4" />
            View Order
          </button>

          {canDispatchOrder ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition-colors hover:bg-emerald-50"
              onClick={() => handleAction(() => onDispatch(order))}
            >
              <Truck className="h-4 w-4" />
              Dispatch
            </button>
          ) : null}

          {canCancelOrder ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              onClick={() => handleAction(() => onCancel(order))}
            >
              Cancel Order
            </button>
          ) : null}

          {canReturnOrder ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-orange-600 transition-colors hover:bg-orange-50"
              onClick={() => handleAction(() => onReturn(order))}
            >
              Process Return
            </button>
          ) : null}

          {canEditLines ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onEditLines(order))}
            >
              Edit Lines
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function OrdersPage() {
  usePageTitle('Sales Orders');
  const location = useLocation();

  const { canCreateOrders, canDispatch, isReadOnly } = useRoleAccess();
  const {
    orders,
    isLoading,
    error,
    pagination,
    filters,
    stats,
    statusCounts,
    pendingDispatchOrders,
    customersForSelect,
    productsForSelect,
    fetchOrders,
    fetchStats,
    handleFilterChange,
    handlePageChange,
  } = useOrders();

  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const debouncedSearchValue = useDebounce(searchValue, 400);

  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const customerMenuRef = useRef<HTMLDivElement>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAction, setDrawerAction] = useState<DrawerAction>(null);
  const [actionToken, setActionToken] = useState(0);
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | null>(null);

  const navigationState = location.state as {
    customer_id?: string;
    filter?: string;
    openCreate?: boolean;
  } | null;

  useClickOutside(customerMenuRef, () => setIsCustomerMenuOpen(false));

  useEffect(() => {
    if (!navigationState) {
      return;
    }

    let handledState = false;

    if (navigationState.customer_id) {
      handleFilterChange('customer_id', navigationState.customer_id);
      setPrefillCustomerId(navigationState.customer_id);
      handledState = true;
    }

    if (navigationState.filter === 'pending_dispatch') {
      handleFilterChange('status', 'confirmed');
      handledState = true;
    }

    if (navigationState.openCreate) {
      setIsCreateOpen(true);
      handledState = true;
    }

    if (handledState) {
      window.history.replaceState({}, '', location.pathname);
    }
  }, [handleFilterChange, location.pathname, navigationState]);

  useEffect(() => {
    const normalizedSearchValue = debouncedSearchValue.trim();

    if ((filters.search ?? '') !== normalizedSearchValue) {
      handleFilterChange('search', normalizedSearchValue || undefined);
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  const selectedCustomerOption = useMemo(
    () => customersForSelect.find((customer) => customer.value === filters.customer_id) ?? null,
    [customersForSelect, filters.customer_id],
  );

  useEffect(() => {
    setCustomerSearch(selectedCustomerOption?.label ?? '');
  }, [selectedCustomerOption]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) {
      return customersForSelect;
    }

    return customersForSelect.filter((customer) =>
      customer.label.toLowerCase().includes(query),
    );
  }, [customerSearch, customersForSelect]);

  const canEdit = canCreateOrders && !isReadOnly;
  const canCancel = canCreateOrders && !isReadOnly;

  const handleOrderUpdated = useCallback(async () => {
    await fetchOrders();
    await fetchStats();
  }, [fetchOrders, fetchStats]);

  const openDrawer = useCallback((orderId: string, action: DrawerAction = null) => {
    setSelectedOrderId(orderId);
    setIsDrawerOpen(true);
    setDrawerAction(action);

    if (action) {
      setActionToken((prev) => prev + 1);
    }
  }, []);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOrderId(null);
    setDrawerAction(null);
  };

  const totalOrders = stats?.totalOrders ?? 0;
  const dispatchedToday = stats?.dispatchedToday ?? 0;
  const totalValue = stats?.totalValue ?? 0;

  const channelCounts = stats?.byChannel ?? {
    local: 0,
    alumex_store: 0,
    export: 0,
  };

  const activeChannel = filters.channel ?? '';
  const activeStatus = filters.status ?? '';

  const activeFilterCount =
    Number(Boolean(searchValue.trim())) +
    Number(Boolean(filters.customer_id)) +
    Number(Boolean(filters.from_date)) +
    Number(Boolean(filters.to_date));

  const columns = useMemo<Column<SalesOrder>[]>(() => [
    {
      key: 'id',
      header: 'Order ID',
      render: (row) => (
        <span className="font-mono text-xs font-medium">{formatOrderId(row.id)}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div>
          <p className="text-sm font-medium">{row.customer?.name ?? '—'}</p>
          <p className="text-xs text-gray-500">{row.customer?.type ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      render: (row) => (
        <Badge
          label={row.channel === 'alumex_store' ? 'Alumex Store' : row.channel}
          color={getChannelBadgeColor(row.channel)}
        />
      ),
    },
    {
      key: 'lines',
      header: 'Items',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row._count?.order_lines ?? 0} line(s)
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          label={getJobStatusLabel(row.status)}
          color={getOrderStatusBadgeColor(row.status)}
        />
      ),
    },
    {
      key: 'order_date',
      header: 'Order Date',
      sortable: true,
      render: (row) => formatDate(row.order_date),
    },
    {
      key: 'dispatch_date',
      header: 'Dispatch Date',
      render: (row) =>
        row.dispatch_date ? formatDate(row.dispatch_date) : <span className="text-sm text-gray-400">—</span>,
    },
    {
      key: 'owner',
      header: 'Created By',
      render: (row) => <span className="text-xs text-gray-500">{row.owner?.name ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '64px',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <OrderActions
            order={row}
            canDispatch={canDispatch}
            canCancel={canCancel}
            canEdit={canEdit}
            onView={(order) => openDrawer(order.id)}
            onDispatch={(order) => openDrawer(order.id, 'dispatch')}
            onCancel={(order) => openDrawer(order.id, 'cancel')}
            onReturn={(order) => openDrawer(order.id, 'return')}
            onEditLines={(order) => openDrawer(order.id, 'edit-lines')}
          />
        </div>
      ),
    },
  ], [canCancel, canDispatch, canEdit, openDrawer]);

  const page = pagination?.page ?? filters.page ?? 1;
  const limit = pagination?.limit ?? filters.limit ?? 10;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <section className="space-y-4">
      <PageHeader
        title="Sales Orders"
        subtitle="Manage local, Alumex Store and export orders"
        breadcrumbs={[{ label: 'Sales Orders', path: '/orders' }]}
        actions={canCreateOrders ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            onClick={() => {
              setPrefillCustomerId(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Order
          </button>
        ) : undefined}
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={formatNumber(totalOrders, 0)}
          subtitle="Across all channels"
          icon={Package}
          color="amber"
        />
        <StatCard
          title="Pending Dispatch"
          value={formatNumber(pendingDispatchOrders.length, 0)}
          subtitle="Ready to ship"
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Dispatched Today"
          value={formatNumber(dispatchedToday, 0)}
          subtitle="Completed today"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(totalValue)}
          subtitle="Order value (LKR)"
          icon={DollarSign}
          color="purple"
        />
      </section>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 pb-2 text-sm font-semibold">
          {channelTabs.map((tab) => {
            const isActive = activeChannel === tab.value;
            const count = tab.value === ''
              ? Object.values(channelCounts).reduce((sum, value) => sum + value, 0)
              : channelCounts[tab.value];
            const Icon = tab.icon;

            return (
              <button
                key={tab.label}
                type="button"
                className={clsx(
                  'border-b-2 pb-2 transition-colors',
                  isActive ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
                onClick={() => handleFilterChange('channel', tab.value)}
              >
                {Icon ? <Icon className="mr-1 inline h-3.5 w-3.5" /> : null}
                {tab.label}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {formatNumber(count, 0)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <OrderStatusBar
        activeStatus={activeStatus}
        statusCounts={statusCounts}
        onStatusChange={(status) => handleFilterChange('status', status)}
      />

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          handleFilterChange('search', undefined);
          handleFilterChange('customer_id', undefined);
          handleFilterChange('from_date', undefined);
          handleFilterChange('to_date', undefined);
        }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by order ID or customer"
          className="h-10 w-full min-w-55 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-sm"
        />

        <div ref={customerMenuRef} className="relative min-w-55">
          <input
            type="text"
            value={customerSearch}
            onChange={(event) => {
              const nextValue = event.target.value;
              setCustomerSearch(nextValue);
              setIsCustomerMenuOpen(true);

              if (!nextValue) {
                handleFilterChange('customer_id', undefined);
              }
            }}
            onFocus={() => setIsCustomerMenuOpen(true)}
            placeholder="All Customers"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          />

          {isCustomerMenuOpen ? (
            <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
              {filteredCustomers.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">No customers found</p>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.value}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-amber-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      handleFilterChange('customer_id', customer.value);
                      setCustomerSearch(customer.label);
                      setIsCustomerMenuOpen(false);
                    }}
                  >
                    {customer.label}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <input
          type="date"
          value={filters.from_date ?? ''}
          onChange={(event) => handleFilterChange('from_date', event.target.value || undefined)}
          className="h-10 min-w-45 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        />
        <input
          type="date"
          value={filters.to_date ?? ''}
          onChange={(event) => handleFilterChange('to_date', event.target.value || undefined)}
          className="h-10 min-w-45 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        />
      </FilterBar>

      {pendingDispatchOrders.length > 0 && canDispatch ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>{pendingDispatchOrders.length} order(s) are ready for dispatch</span>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2"
            onClick={() => handleFilterChange('status', 'confirmed')}
          >
            View pending
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="inline-flex w-full items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        emptyMessage="No orders found for the selected filters."
        onRowClick={(row) => openDrawer(row.id)}
      />

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
              key={`orders-page-${pageNumber}`}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pageNumber === page
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
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

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Sales Order"
        size="xl"
      >
        <CreateOrderForm
          customersForSelect={customersForSelect}
          productsForSelect={productsForSelect}
          initialCustomerId={prefillCustomerId ?? undefined}
          onCancel={() => setIsCreateOpen(false)}
          onSuccess={async (createdOrder) => {
            setIsCreateOpen(false);
            toast.success(`Order ${formatOrderId(createdOrder.id)} created — stock reserved`);
            await fetchOrders();
            await fetchStats();
          }}
        />
      </Modal>

      <OrderDetailDrawer
        orderId={selectedOrderId}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onOrderUpdated={handleOrderUpdated}
        initialAction={drawerAction}
        actionToken={actionToken}
      />
    </section>
  );
}
