import {
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerDetailCard from '../../components/customers/CustomerDetailCard';
import CustomerForm from '../../components/customers/CustomerForm';
import Badge from '../../components/ui/Badge';
import DataTable, { type Column } from '../../components/ui/DataTable';
import ErrorAlert from '../../components/ui/ErrorAlert';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth, useClickOutside, useCustomers, useDebounce, usePageTitle, useRoleAccess } from '../../hooks';
import type { CreateCustomerDto, Customer, CustomerType, UpdateCustomerDto } from '../../types/sales.types';
import { getCustomerTypeBadgeColor, getCountryEmoji } from '../../utils/sales.utils';
import { formatNumber } from '../../utils/formatters';

type CustomerModalMode = 'create' | 'edit' | 'view' | null;

type CustomerTab = {
  label: string;
  value: CustomerType | '';
};

const customerTabs: CustomerTab[] = [
  { label: 'All', value: '' },
  { label: 'B2B', value: 'b2b' },
  { label: 'Fabricator', value: 'fabricator' },
  { label: 'Retail', value: 'retail' },
  { label: 'Export', value: 'export' },
  { label: 'Government', value: 'government' },
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

function CustomerActions({
  customer,
  canEdit,
  canCreateOrders,
  onViewDetails,
  onEdit,
  onCreateOrder,
  onViewOrders,
}: {
  customer: Customer;
  canEdit: boolean;
  canCreateOrders: boolean;
  onViewDetails: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onCreateOrder: (customer: Customer) => void;
  onViewOrders: (customer: Customer) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Customer actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewDetails(customer))}
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>

          {canCreateOrders ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onCreateOrder(customer))}
            >
              <ShoppingCart className="h-4 w-4" />
              New Order for Customer
            </button>
          ) : null}

          {canEdit ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onEdit(customer))}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-600 transition-colors hover:bg-blue-50"
            onClick={() => handleAction(() => onViewOrders(customer))}
          >
            <Eye className="h-4 w-4" />
            View Orders
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function CustomersPage() {
  usePageTitle('Customers');

  const navigate = useNavigate();
  const { canCreateOrders, isAdmin } = useRoleAccess();
  const { user } = useAuth();
  const {
    customers,
    isLoading,
    error,
    pagination,
    filters,
    countriesInUse,
    handleFilterChange,
    handlePageChange,
    handleCreate,
    handleUpdate,
  } = useCustomers();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalMode, setModalMode] = useState<CustomerModalMode>(null);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debouncedSearchValue = useDebounce(searchValue, 400);

  useEffect(() => {
    const normalizedSearchValue = debouncedSearchValue.trim();

    if ((filters.search ?? '') !== normalizedSearchValue) {
      handleFilterChange('search', normalizedSearchValue || undefined);
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  const typeCounts = useMemo(() => {
    return customers.reduce<Record<CustomerType, number>>(
      (acc, customer) => {
        acc[customer.type] += 1;
        return acc;
      },
      {
        b2b: 0,
        fabricator: 0,
        retail: 0,
        export: 0,
        government: 0,
      },
    );
  }, [customers]);

  const activeType = filters.type ?? '';

  const activeFilterCount =
    Number(Boolean(searchValue.trim())) +
    Number(Boolean(filters.country)) +
    Number(Boolean(activeType));

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setModalMode('create');
  };

  const openViewModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('view');
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('edit');
  };

  const openOrderModal = (customer: Customer) => {
    navigate('/orders', { state: { customer_id: customer.id, openCreate: true } });
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedCustomer(null);
    setIsSubmitting(false);
  };

  const handleCustomerSubmit = async (data: CreateCustomerDto | UpdateCustomerDto) => {
    setIsSubmitting(true);

    try {
      if (modalMode === 'edit') {
        if (!selectedCustomer) {
          return;
        }

        const didUpdate = await handleUpdate(selectedCustomer.id, data as UpdateCustomerDto);
        if (didUpdate) {
          closeModal();
        }
        return;
      }

      const didCreate = await handleCreate(data as CreateCustomerDto);
      if (didCreate) {
        closeModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditCustomer = useCallback(
    (customer: Customer) => isAdmin || customer.owner_user_id === user?.user_id,
    [isAdmin, user?.user_id],
  );

  const columns = useMemo<Column<Customer>[]>(() => [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-gray-500">{row.contact_email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge label={row.type} color={getCustomerTypeBadgeColor(row.type)} />
      ),
    },
    {
      key: 'country',
      header: 'Country',
      render: (row) => (
        <span>
          {getCountryEmoji(row.country)} {row.country}
        </span>
      ),
    },
    {
      key: 'contact_phone',
      header: 'Phone',
      render: (row) => row.contact_phone ?? <span className="text-gray-400">—</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      render: (row) => (
        <span className="font-medium text-blue-600">
          {row._count?.sales_orders ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '64px',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <CustomerActions
            customer={row}
            canEdit={canEditCustomer(row)}
            canCreateOrders={canCreateOrders}
            onViewDetails={openViewModal}
            onEdit={openEditModal}
            onCreateOrder={openOrderModal}
            onViewOrders={(customer) =>
              navigate('/orders', { state: { customer_id: customer.id } })
            }
          />
        </div>
      ),
    },
  ], [canCreateOrders, canEditCustomer, navigate]);

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
        title="Customers"
        subtitle="Manage B2B accounts, fabricators, retail and export customers"
        breadcrumbs={[{ label: 'Customers', path: '/customers' }]}
        actions={canCreateOrders ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        ) : undefined}
      />

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 pb-2 text-sm font-semibold">
          {customerTabs.map((tab) => {
            const isActive = activeType === tab.value;
            const count = tab.value === '' ? customers.length : typeCounts[tab.value];

            return (
              <button
                key={tab.label}
                type="button"
                className={`border-b-2 pb-2 transition-colors ${
                  isActive ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => handleFilterChange('type', tab.value)}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {formatNumber(count, 0)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          handleFilterChange('search', undefined);
          handleFilterChange('country', undefined);
          handleFilterChange('type', '');
        }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by name or email"
          className="h-10 w-full min-w-55 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-sm"
        />

        <select
          value={filters.country ?? ''}
          onChange={(event) => handleFilterChange('country', event.target.value || undefined)}
          className="h-10 min-w-45 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          <option value="">All Countries</option>
          {countriesInUse.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </FilterBar>

      {error ? <ErrorAlert message={error} /> : null}

      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyMessage="No customers found for the selected filters."
        onRowClick={openViewModal}
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
              key={`customers-page-${pageNumber}`}
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
        isOpen={modalMode === 'create'}
        onClose={closeModal}
        title="Add Customer"
        size="md"
      >
        <CustomerForm
          onSubmit={handleCustomerSubmit}
          isSubmitting={isSubmitting}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={modalMode === 'edit' && Boolean(selectedCustomer)}
        onClose={closeModal}
        title="Edit Customer"
        size="md"
      >
        {selectedCustomer ? (
          <CustomerForm
            initialData={selectedCustomer}
            onSubmit={handleCustomerSubmit}
            isSubmitting={isSubmitting}
            onCancel={closeModal}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === 'view' && Boolean(selectedCustomer)}
        onClose={closeModal}
        title="Customer Details"
        size="lg"
      >
        {selectedCustomer ? (
          <CustomerDetailCard customer={selectedCustomer} showOrderHistory />
        ) : null}
      </Modal>

    </section>
  );
}
