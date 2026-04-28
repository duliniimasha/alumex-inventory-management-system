import { isAxiosError } from 'axios';
import { AlertTriangle, Calendar, Factory, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { createProductionJob, updateProductionJob } from '../../api/production.api';
import JobDetailDrawer from '../../components/production/JobDetailDrawer';
import JobStatusBadge from '../../components/production/JobStatusBadge';
import JobStatusBar from '../../components/production/JobStatusBar';
import ProductionJobActions from '../../components/production/ProductionJobActions';
import ProductionJobForm from '../../components/production/ProductionJobForm';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import FilterBar from '../../components/ui/FilterBar';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import {
  useDebounce,
  usePageTitle,
  useProductionJobs,
  useRoleAccess,
} from '../../hooks';
import type {
  CreateProductionJobDto,
  ProductionJob,
  UpdateProductionJobDto,
} from '../../types/production.types';
import { formatDate, formatWeight, toTitleCase } from '../../utils/formatters';

const processTypeOptions = [
  { value: '', label: 'All Processes' },
  { value: 'extrusion', label: 'Extrusion' },
  { value: 'powder_coating', label: 'Powder Coating' },
  { value: 'anodizing', label: 'Anodizing' },
  { value: 'die_casting', label: 'Die Casting' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'welding', label: 'Welding' },
  { value: 'laser', label: 'Laser' },
  { value: 'cnc', label: 'CNC' },
  { value: 'other', label: 'Other' },
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

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export default function ProductionPage() {
  usePageTitle('Production');

  const location = useLocation();

  const { canManageProduction, canDoQC, isAdmin } = useRoleAccess();
  const {
    jobs,
    isLoading,
    error,
    pagination,
    filters,
    statusCounts,
    rawMaterialsForSelect,
    diesForSelect,
    fetchJobs,
    handleFilterChange,
    handlePageChange,
    handleDelete,
  } = useProductionJobs();

  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<ProductionJob | null>(null);
  const [editJob, setEditJob] = useState<ProductionJob | null>(null);
  const [jobOverrides, setJobOverrides] = useState<Record<string, ProductionJob>>({});

  const debouncedSearchValue = useDebounce(searchValue, 400);

  useEffect(() => {
    if (location.state?.openJobId) {
      const job = jobs.find((job) => job.id === location.state.openJobId);
      if (job) {
        setSelectedJobId(job.id);
      }
      window.history.replaceState({}, '', location.pathname);
    }
  }, [jobs, location.pathname, location.state]);

  useEffect(() => {
    const normalizedSearchValue = debouncedSearchValue.trim();

    if ((filters.search ?? '') !== normalizedSearchValue) {
      handleFilterChange('search', normalizedSearchValue || undefined);
    }
  }, [debouncedSearchValue, filters.search, handleFilterChange]);

  const activeFilterCount =
    Number(Boolean(filters.status)) +
    Number(Boolean(filters.process_type)) +
    Number(Boolean(filters.from_date)) +
    Number(Boolean(filters.to_date)) +
    Number(Boolean(searchValue.trim()));

  const page = pagination?.page ?? filters.page ?? 1;
  const limit = pagination?.limit ?? filters.limit ?? 10;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);
  const visiblePages = getVisiblePages(page, totalPages);

  const displayJobs = useMemo(
    () => jobs.map((job) => jobOverrides[job.id] ?? job),
    [jobs, jobOverrides],
  );

  useEffect(() => {
    setJobOverrides((previous) => {
      const nextOverrides: Record<string, ProductionJob> = {};

      jobs.forEach((job) => {
        if (previous[job.id]) {
          nextOverrides[job.id] = previous[job.id];
        }
      });

      return nextOverrides;
    });
  }, [jobs]);

  const selectedJob = useMemo(
    () => displayJobs.find((job) => job.id === selectedJobId) ?? null,
    [displayJobs, selectedJobId],
  );

  const openDrawer = (job: ProductionJob) => {
    setSelectedJobId(job.id);
  };

  const closeDrawer = () => {
    setSelectedJobId(null);
  };

  const handleJobUpdated = (updatedJob: ProductionJob) => {
    setJobOverrides((previous) => ({
      ...previous,
      [updatedJob.id]: updatedJob,
    }));

    if (selectedJobId === updatedJob.id) {
      setSelectedJobId(updatedJob.id);
    }
  };

  const handleCreateSubmit = async (payload: CreateProductionJobDto | UpdateProductionJobDto) => {
    setIsSubmitting(true);

    try {
      const createPayload = payload as CreateProductionJobDto;
      const inputQty = 'input_qty_kg' in payload ? payload.input_qty_kg : 0;

      await createProductionJob(createPayload);
      toast.success(
        `Production job created. ${inputQty} kg deducted from stock.`,
      );
      setIsCreateOpen(false);
      await fetchJobs();
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Failed to create production job.'));
      throw submitError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload: CreateProductionJobDto | UpdateProductionJobDto) => {
    if (!editJob) {
      return;
    }

    setIsSubmitting(true);

    try {
      const updated = await updateProductionJob(editJob.id, payload as UpdateProductionJobDto);
      toast.success('Production job updated successfully.');
      handleJobUpdated(updated);
      setEditJob(null);
    } catch (submitError) {
      toast.error(getErrorMessage(submitError, 'Failed to update production job.'));
      throw submitError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) {
      return;
    }

    const didDelete = await handleDelete(jobToDelete.id);

    if (didDelete) {
      toast.success('Production job deleted successfully.');
      setJobToDelete(null);
      if (selectedJobId === jobToDelete.id) {
        closeDrawer();
      }
    }
  };

  const handleQuickStart = async (job: ProductionJob) => {
    try {
      const updated = await updateProductionJob(job.id, { status: 'in_progress' });
      toast.success('Production job started.');
      handleJobUpdated(updated);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to start production job.'));
    }
  };

  const columns = useMemo<Column<ProductionJob>[]>(() => [
    {
      key: 'id',
      header: 'Job ID',
      render: (row) => (
        <span className="font-mono text-xs text-gray-600">
          #JOB-{row.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      key: 'process_type',
      header: 'Process',
      render: (row) => <Badge label={toTitleCase(row.process_type)} color="blue" />,
    },
    {
      key: 'raw_material',
      header: 'Material',
      render: (row) => row.raw_material?.grade ?? row.raw_material?.material_type ?? '—',
    },
    {
      key: 'input_qty_kg',
      header: 'Input (kg)',
      sortable: true,
      render: (row) => formatWeight(row.input_qty_kg),
    },
    {
      key: 'output_qty_kg',
      header: 'Output (kg)',
      render: (row) =>
        Number.isFinite(row.output_qty_kg) ? (
          formatWeight(row.output_qty_kg as number)
        ) : (
          <span className="text-gray-400">Pending</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <JobStatusBadge status={row.status} />,
    },
    {
      key: 'qc',
      header: 'QC',
      render: (row) => {
        const count = row._count?.qc_inspections ?? 0;

        return count > 0 ? (
          <span className="text-sm text-blue-600">
            {count} inspection{count > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-sm text-gray-400">None</span>
        );
      },
    },
    {
      key: 'started_at',
      header: 'Started',
      render: (row) =>
        row.started_at ? (
          formatDate(row.started_at)
        ) : (
          <span className="text-gray-400">Not started</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '64px',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <ProductionJobActions
            job={row}
            canManageProduction={canManageProduction}
            canDoQC={canDoQC}
            isAdmin={isAdmin}
            onViewDetails={openDrawer}
            onStartJob={handleQuickStart}
            onAddInspection={openDrawer}
            onEdit={setEditJob}
            onDelete={setJobToDelete}
          />
        </div>
      ),
    },
  ], [canDoQC, canManageProduction, handleQuickStart, isAdmin]);

  const emptyState = !isLoading && displayJobs.length === 0;
  const hasAnyJobs = displayJobs.length > 0 || isLoading;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Production Jobs"
        subtitle="Manage extrusion, coating, and value-added processing jobs"
        breadcrumbs={[{ label: 'Production', path: '/production' }]}
        actions={canManageProduction ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Job
          </button>
        ) : undefined}
      />

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <JobStatusBar
          activeStatus={filters.status ?? ''}
          statusCounts={statusCounts}
          onStatusChange={(status) => handleFilterChange('status', status)}
        />
      </div>

      <FilterBar
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchValue('');
          handleFilterChange('status', '');
          handleFilterChange('process_type', '');
          handleFilterChange('from_date', undefined);
          handleFilterChange('to_date', undefined);
          handleFilterChange('search', undefined);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={filters.from_date ?? ''}
              onChange={(event) => handleFilterChange('from_date', event.target.value || undefined)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </label>

          <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={filters.to_date ?? ''}
              onChange={(event) => handleFilterChange('to_date', event.target.value || undefined)}
              className="bg-transparent text-sm text-gray-700 outline-none"
            />
          </label>
        </div>

        <select
          value={filters.process_type ?? ''}
          onChange={(event) =>
            handleFilterChange('process_type', event.target.value as ProductionJob['process_type'] | '')
          }
          className="h-10 min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
        >
          {processTypeOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search by job ID or material grade"
          className="h-10 w-full min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 md:max-w-sm"
        />
      </FilterBar>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            onClick={() => void fetchJobs()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {emptyState ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <div className="rounded-full bg-amber-50 p-4 text-amber-500">
            <Factory className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No production jobs found</p>
          {activeFilterCount > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  handleFilterChange('status', '');
                  handleFilterChange('process_type', '');
                  handleFilterChange('from_date', undefined);
                  handleFilterChange('to_date', undefined);
                  handleFilterChange('search', undefined);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Reset Filters
              </button>
            </div>
          ) : canManageProduction ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Create your first production job</p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                New Job
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={displayJobs}
          isLoading={isLoading}
          emptyMessage="No production jobs found for the selected filters."
          onRowClick={openDrawer}
        />
      )}

      {hasAnyJobs ? (
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
                key={`production-page-${pageNumber}`}
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
      ) : null}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Production Job" size="lg">
        <ProductionJobForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setIsCreateOpen(false)}
          isSubmitting={isSubmitting}
          rawMaterialsForSelect={rawMaterialsForSelect}
          diesForSelect={diesForSelect}
        />
      </Modal>

      <Modal isOpen={Boolean(editJob)} onClose={() => setEditJob(null)} title="Edit Production Job" size="lg">
        {editJob ? (
          <ProductionJobForm
            initialData={editJob}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditJob(null)}
            isSubmitting={isSubmitting}
            rawMaterialsForSelect={rawMaterialsForSelect}
            diesForSelect={diesForSelect}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(jobToDelete)}
        onClose={() => setJobToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Production Job"
        message={`Are you sure you want to delete #JOB-${jobToDelete?.id.slice(0, 8).toUpperCase()}? This action cannot be undone.`}
        confirmLabel="Delete Job"
        variant="danger"
      />

      <JobDetailDrawer
        job={selectedJob}
        isOpen={Boolean(selectedJobId)}
        onClose={closeDrawer}
        onJobUpdated={handleJobUpdated}
      />
    </section>
  );
}
