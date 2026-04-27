import { isAxiosError } from 'axios';
import { AlertTriangle, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createRawMaterial, updateRawMaterial } from '../../api/rawMaterial.api';
import RawMaterialActions from '../../components/rawMaterials/RawMaterialActions';
import RawMaterialForm from '../../components/rawMaterials/RawMaterialForm';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import {
  useDebounce,
  usePageTitle,
  useRawMaterials,
  useRoleAccess,
} from '../../hooks';
import type {
  CreateRawMaterialDto,
  RawMaterial,
  UpdateRawMaterialDto,
} from '../../types/rawMaterial.types';

type MaterialModalMode = 'create' | 'edit' | 'view' | null;

const materialTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'billet', label: 'Billet' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'die', label: 'Die' },
  { value: 'traded_good', label: 'Traded Good' },
  { value: 'other', label: 'Other' },
] as const;

const materialTypeLabel: Record<RawMaterial['material_type'], string> = {
  billet: 'Billet',
  chemical: 'Chemical',
  die: 'Die',
  traded_good: 'Traded Good',
  other: 'Other',
};

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

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function formatNullableNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return value.toLocaleString();
}

export default function RawMaterialsPage() {
  usePageTitle('Raw Materials');

  const { canManageSuppliers, canManageProduction, isAdmin, currentRole } = useRoleAccess();
  const {
    rawMaterials,
    isLoading,
    error,
    pagination,
    filters,
    belowReorderCount,
    suppliersForSelect,
    fetchRawMaterials,
    handleFilterChange,
    handlePageChange,
    handleDelete,
  } = useRawMaterials();

  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [modalMode, setModalMode] = useState<MaterialModalMode>(null);
  const [materialToDelete, setMaterialToDelete] = useState<RawMaterial | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const [adjustTarget, setAdjustTarget] = useState<RawMaterial | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  const debouncedSearchValue = useDebounce(searchValue, 400);

  useEffect(() => {
    const normalizedSearchValue = debouncedSearchValue.trim();

    if ((filters.search ?? '') !== normalizedSearchValue) {
      handleFilterChange({
        search: normalizedSearchValue || undefined,
      });
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  const canAddOrEdit = canManageSuppliers;
  const canAdjustQuantity = canManageSuppliers || canManageProduction || currentRole === 'production_supervisor';
  const canDelete = isAdmin;

  const activeFilterCount =
    Number(Boolean(searchValue.trim())) +
    Number(Boolean(filters.material_type)) +
    Number(Boolean(filters.supplier_id)) +
    Number(Boolean(filters.below_reorder_level));

  const totalMaterials = pagination?.total ?? rawMaterials.length;
  const totalStockWeight = rawMaterials.reduce(
    (sum, material) => sum + (Number.isFinite(material.quantity_kg) ? material.quantity_kg : 0),
    0,
  );
  const suppliersCount = new Set(rawMaterials.map((material) => material.supplier_id)).size;

  const openCreateModal = () => {
    setSelectedMaterial(null);
    setModalMode('create');
  };

  const openEditModal = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setModalMode('edit');
  };

  const openViewModal = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setModalMode('view');
  };

  const closeCrudModal = () => {
    setModalMode(null);
    setSelectedMaterial(null);
    setIsSubmitting(false);
  };

  const openAdjustModal = (material: RawMaterial) => {
    setAdjustTarget(material);
    setAdjustQuantity(Number.isFinite(material.quantity_kg) ? String(material.quantity_kg) : '');
    setAdjustReason('');
    setAdjustError(null);
  };

  const closeAdjustModal = () => {
    setAdjustTarget(null);
    setAdjustQuantity('');
    setAdjustReason('');
    setAdjustError(null);
    setIsAdjustSubmitting(false);
  };

  const handleFormSubmit = async (payload: CreateRawMaterialDto | UpdateRawMaterialDto) => {
    setIsSubmitting(true);

    try {
      if (modalMode === 'edit') {
        if (!selectedMaterial) {
          throw new Error('No raw material selected for editing.');
        }

        await updateRawMaterial(selectedMaterial.id, payload as UpdateRawMaterialDto);
        toast.success('Raw material updated successfully.');
      } else {
        await createRawMaterial(payload as CreateRawMaterialDto);
        toast.success('Raw material created successfully.');
      }

      closeCrudModal();
      await fetchRawMaterials();
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Failed to save raw material.'));
      throw submitError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!materialToDelete) {
      return;
    }

    const didDelete = await handleDelete(materialToDelete.id);

    if (didDelete) {
      toast.success('Raw material deleted successfully.');
      setMaterialToDelete(null);
      await fetchRawMaterials();
    }
  };

  const handleAdjustQuantitySubmit = async () => {
    if (!adjustTarget) {
      return;
    }

    const parsedQuantity = Number(adjustQuantity);
    const trimmedReason = adjustReason.trim();

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      setAdjustError('Quantity must be a valid number greater than or equal to 0.');
      return;
    }

    if (!trimmedReason) {
      setAdjustError('Reason is required for quantity adjustment.');
      return;
    }

    setAdjustError(null);
    setIsAdjustSubmitting(true);

    try {
      await updateRawMaterial(adjustTarget.id, {
        quantity_kg: parsedQuantity,
      });

      toast.success('Quantity adjusted successfully.');
      closeAdjustModal();
      await fetchRawMaterials();
    } catch (adjustSubmitError) {
      setAdjustError(getErrorMessage(adjustSubmitError, 'Failed to adjust quantity.'));
    } finally {
      setIsAdjustSubmitting(false);
    }
  };

  const columns = useMemo<Column<RawMaterial>[]>(() => [
    {
      key: 'material_type',
      header: 'Type',
      sortable: true,
      render: (row) => <Badge label={materialTypeLabel[row.material_type]} color="blue" />,
    },
    {
      key: 'grade',
      header: 'Grade / Spec',
      sortable: true,
      render: (row) => row.grade || <span className="text-gray-400">—</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (row) => row.supplier?.name ?? '—',
    },
    {
      key: 'quantity_kg',
      header: 'Qty (kg)',
      sortable: true,
      render: (row) => {
        const hasQuantity = Number.isFinite(row.quantity_kg);
        const hasReorderLevel = Number.isFinite(row.reorder_level);
        const isLowStock = hasQuantity && hasReorderLevel && row.quantity_kg < row.reorder_level;

        return (
          <span className={isLowStock ? 'font-semibold text-red-600' : undefined}>
            {formatNullableNumber(row.quantity_kg)}
          </span>
        );
      },
    },
    {
      key: 'reorder_level',
      header: 'Reorder Level',
      render: (row) => formatNullableNumber(row.reorder_level),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const hasQuantity = Number.isFinite(row.quantity_kg);
        const hasReorderLevel = Number.isFinite(row.reorder_level);

        if (!hasQuantity || !hasReorderLevel) {
          return <Badge label="Unknown" color="gray" />;
        }

        return row.quantity_kg < row.reorder_level
          ? <Badge label="Low Stock" color="red" />
          : <Badge label="Adequate" color="green" />;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '64px',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <RawMaterialActions
            row={row}
            canEdit={canAddOrEdit}
            canAdjustQuantity={canAdjustQuantity}
            canDelete={canDelete}
            onViewDetails={openViewModal}
            onEdit={openEditModal}
            onAdjustQuantity={openAdjustModal}
            onDelete={setMaterialToDelete}
          />
        </div>
      ),
    },
  ], [canAddOrEdit, canAdjustQuantity, canDelete]);

  const page = pagination?.page ?? filters.page ?? 1;
  const limit = pagination?.limit ?? filters.limit ?? 10;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);
  const visiblePages = getVisiblePages(page, totalPages);

  const supplierEmail = ((selectedMaterial?.supplier as { contact_email?: string } | undefined)?.contact_email) ?? '—';

  return (
    <section className="space-y-4">
      <PageHeader
        title="Raw Materials"
        subtitle="Track billets, chemicals, dies and traded goods inventory"
        breadcrumbs={[{ label: 'Raw Materials', path: '/raw-materials' }]}
        actions={canAddOrEdit ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        ) : undefined}
      />

      {belowReorderCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{belowReorderCount} material(s) are below their reorder level</span>
          </div>
          <button
            type="button"
            className="font-semibold text-amber-900 underline decoration-amber-600 underline-offset-2"
            onClick={() => handleFilterChange({ below_reorder_level: true, page: 1 })}
          >
            View alerts
          </button>
        </div>
      ) : null}

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          handleFilterChange({
            search: undefined,
            material_type: '',
            supplier_id: undefined,
            below_reorder_level: undefined,
            page: 1,
          });
        }}
      >
        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by grade"
          className="h-10 w-full min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-xs"
        />

        <select
          value={filters.material_type ?? ''}
          onChange={(event) => {
            handleFilterChange({
              material_type: event.target.value as RawMaterial['material_type'] | '',
            });
          }}
          className="h-10 min-w-[170px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          {materialTypeOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.supplier_id ?? ''}
          onChange={(event) => {
            handleFilterChange({
              supplier_id: event.target.value || undefined,
            });
          }}
          className="h-10 min-w-[210px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          <option value="">All Suppliers</option>
          {suppliersForSelect.map((supplier) => (
            <option key={supplier.value} value={supplier.value}>
              {supplier.label}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(filters.below_reorder_level)}
            onChange={(event) => {
              handleFilterChange({
                below_reorder_level: event.target.checked ? true : undefined,
              });
            }}
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          Below reorder level only
        </label>
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Materials</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatNullableNumber(totalMaterials)}</p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Stock Weight</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatNullableNumber(totalStockWeight)} kg</p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Below Reorder Level</p>
          <p className={`mt-2 text-2xl font-bold ${belowReorderCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatNullableNumber(belowReorderCount)}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Suppliers Count</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatNullableNumber(suppliersCount)}</p>
        </article>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            onClick={() => void fetchRawMaterials()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rawMaterials}
        isLoading={isLoading}
        emptyMessage="No raw materials found for the selected filters."
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
              key={`raw-material-page-${pageNumber}`}
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

      <Modal isOpen={modalMode === 'create'} onClose={closeCrudModal} title="Add Material" size="md">
        <RawMaterialForm
          suppliersForSelect={suppliersForSelect}
          onSubmit={handleFormSubmit}
          onCancel={closeCrudModal}
          isSubmitting={isSubmitting}
        />
      </Modal>

      <Modal
        isOpen={modalMode === 'edit' && Boolean(selectedMaterial)}
        onClose={closeCrudModal}
        title="Edit Material"
        size="md"
      >
        {selectedMaterial ? (
          <RawMaterialForm
            initialData={selectedMaterial}
            suppliersForSelect={suppliersForSelect}
            onSubmit={handleFormSubmit}
            onCancel={closeCrudModal}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </Modal>

      <Modal
        isOpen={modalMode === 'view' && Boolean(selectedMaterial)}
        onClose={closeCrudModal}
        title="Raw Material Details"
        size="md"
      >
        {selectedMaterial ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Material Type</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{materialTypeLabel[selectedMaterial.material_type]}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Grade / Spec</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedMaterial.grade ?? '—'}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity (kg)</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{formatNullableNumber(selectedMaterial.quantity_kg)}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reorder Level</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{formatNullableNumber(selectedMaterial.reorder_level)}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier Name</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedMaterial.supplier?.name ?? '—'}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier Country</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedMaterial.supplier?.country ?? '—'}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier Email</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{supplierEmail}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{selectedMaterial.unit}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Created At</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{formatDate(selectedMaterial.created_at)}</p>
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Updated At</p>
              <p className="mt-1 text-sm font-medium text-gray-800">{formatDate(selectedMaterial.updated_at)}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(adjustTarget)}
        onClose={closeAdjustModal}
        title="Adjust Quantity"
        size="sm"
      >
        {adjustTarget ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <p>Current Quantity: <span className="font-semibold">{formatNullableNumber(adjustTarget.quantity_kg)} kg</span></p>
              <p className="mt-1">Reorder Level: <span className="font-semibold">{formatNullableNumber(adjustTarget.reorder_level)}</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">New Quantity (kg)</label>
              <input
                type="number"
                step="any"
                value={adjustQuantity}
                onChange={(event) => setAdjustQuantity(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                placeholder="0.00"
                disabled={isAdjustSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Reason</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(event) => setAdjustReason(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                placeholder="Reason for adjustment"
                disabled={isAdjustSubmitting}
              />
            </div>

            {adjustError ? <p className="text-sm text-red-600">{adjustError}</p> : null}

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                onClick={closeAdjustModal}
                disabled={isAdjustSubmitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void handleAdjustQuantitySubmit()}
                disabled={isAdjustSubmitting}
              >
                {isAdjustSubmitting ? 'Saving...' : 'Update Quantity'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(materialToDelete)}
        onClose={() => setMaterialToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Raw Material"
        message={`Are you sure you want to delete ${materialToDelete?.grade ?? materialToDelete?.material_type ?? 'this item'}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}