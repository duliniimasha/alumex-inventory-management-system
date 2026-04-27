import { isAxiosError } from 'axios';
import { AlertTriangle, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createSupplier, updateSupplier } from '../../api/supplier.api';
import SupplierActions from '../../components/suppliers/SupplierActions';
import SupplierForm from '../../components/suppliers/SupplierForm';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useDebounce, usePageTitle, useRoleAccess, useSuppliers } from '../../hooks';
import type {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from '../../types/supplier.types';

type SupplierModalMode = 'create' | 'edit' | 'view' | null;

const countryOptions = [
  'Sri Lanka',
  'India',
  'China',
  'Germany',
  'USA',
  'Australia',
  'UAE',
  'Malaysia',
  'Singapore',
  'Japan',
  'Other',
] as const;

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

function formatDate(date: string) {
  return new Date(date).toLocaleString();
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

export default function SuppliersPage() {
  usePageTitle('Suppliers');

  const { canManageSuppliers, isAdmin } = useRoleAccess();
  const {
    suppliers,
    isLoading,
    error,
    pagination,
    filters,
    fetchSuppliers,
    handleFilterChange,
    handlePageChange,
    handleDelete,
  } = useSuppliers();

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [modalMode, setModalMode] = useState<SupplierModalMode>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const debouncedSearchValue = useDebounce(searchValue, 400);

  useEffect(() => {
    const normalizedSearchValue = debouncedSearchValue.trim();

    if ((filters.search ?? '') !== normalizedSearchValue) {
      handleFilterChange({
        search: normalizedSearchValue || undefined,
      });
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  const activeFilterCount = Number(Boolean(searchValue.trim())) + Number(Boolean(filters.country));

  const openCreateModal = () => {
    setSelectedSupplier(null);
    setModalMode('create');
  };

  const openViewModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalMode('view');
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setModalMode('edit');
  };

  const closeSupplierModal = () => {
    setModalMode(null);
    setSelectedSupplier(null);
    setIsSubmitting(false);
  };

  const handleSupplierSubmit = async (data: CreateSupplierDto | UpdateSupplierDto) => {
    setIsSubmitting(true);

    try {
      if (modalMode === 'edit') {
        if (!selectedSupplier) {
          throw new Error('No supplier selected for editing.');
        }

        await updateSupplier(selectedSupplier.id, data as UpdateSupplierDto);
        return;
      }

      await createSupplier(data as CreateSupplierDto);
    } catch (submitError) {
      const message = getErrorMessage(submitError, 'Failed to save supplier.');
      toast.error(message);
      throw submitError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplierFormSuccess = async () => {
    const successMessage = modalMode === 'edit'
      ? 'Supplier updated successfully.'
      : 'Supplier created successfully.';

    closeSupplierModal();
    toast.success(successMessage);
    await fetchSuppliers();
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) {
      return;
    }

    const didDelete = await handleDelete(supplierToDelete.id);

    if (didDelete) {
      toast.success('Supplier deleted successfully.');
      await fetchSuppliers();
      setSupplierToDelete(null);
    }
  };

  const columns = useMemo<Column<Supplier>[]>(() => [
    { key: 'name', header: 'Supplier Name', sortable: true },
    { key: 'country', header: 'Country', sortable: true },
    { key: 'contact_email', header: 'Contact Email' },
    {
      key: 'certification',
      header: 'Certification',
      render: (row) => row.certification
        ? <Badge label={row.certification} color="blue" />
        : <span className="text-sm text-gray-400">None</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '64px',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <SupplierActions
            supplier={row}
            canManageSuppliers={canManageSuppliers}
            isAdmin={isAdmin}
            onViewDetails={openViewModal}
            onEdit={openEditModal}
            onDelete={setSupplierToDelete}
          />
        </div>
      ),
    },
  ], [canManageSuppliers, isAdmin]);

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
        title="Suppliers"
        subtitle="Manage raw material and traded goods suppliers"
        breadcrumbs={[{ label: 'Suppliers', path: '/suppliers' }]}
        actions={canManageSuppliers ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        ) : undefined}
      />

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          handleFilterChange({
            search: undefined,
            country: undefined,
            page: 1,
          });
        }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by supplier name or email"
          className="h-10 w-full min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-sm"
        />

        <select
          value={filters.country ?? ''}
          onChange={(event) => {
            handleFilterChange({
              country: event.target.value || undefined,
            });
          }}
          className="h-10 min-w-[180px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          <option value="">All countries</option>
          {countryOptions.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </FilterBar>

      {error ? (
        <div className="inline-flex w-full items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={suppliers}
        isLoading={isLoading}
        emptyMessage="No suppliers found for the selected filters."
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
              key={`suppliers-page-${pageNumber}`}
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
        onClose={closeSupplierModal}
        title="Add Supplier"
        size="md"
      >
        <SupplierForm
          onSubmit={handleSupplierSubmit}
          isSubmitting={isSubmitting}
          onCancel={closeSupplierModal}
          onSuccess={handleSupplierFormSuccess}
        />
      </Modal>

      <Modal
        isOpen={modalMode === 'edit' && Boolean(selectedSupplier)}
        onClose={closeSupplierModal}
        title="Edit Supplier"
        size="md"
      >
        {selectedSupplier ? (
          <SupplierForm
            initialData={selectedSupplier}
            onSubmit={handleSupplierSubmit}
            isSubmitting={isSubmitting}
            onCancel={closeSupplierModal}
            onSuccess={handleSupplierFormSuccess}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === 'view' && Boolean(selectedSupplier)}
        onClose={closeSupplierModal}
        title="Supplier Details"
        size="md"
      >
        {selectedSupplier ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier Name</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedSupplier.name}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Country</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedSupplier.country}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact Email</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedSupplier.contact_email}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Certification</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedSupplier.certification ?? 'None'}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created At</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{formatDate(selectedSupplier.created_at)}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Updated At</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{formatDate(selectedSupplier.updated_at)}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Are you sure you want to delete ${supplierToDelete?.name ?? 'this supplier'}? This action cannot be undone.`}
        confirmLabel="Delete Supplier"
        variant="danger"
      />
    </section>
  );
}
