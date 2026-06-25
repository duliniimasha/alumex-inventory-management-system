import clsx from 'clsx';
import { Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteProductionJob, updateProductionJob } from '../../api/production.api';
import { getDies } from '../../api/die.api';
import { getRawMaterials } from '../../api/rawMaterial.api';
import { useQcInspections } from '../../hooks/useQcInspections';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import type { JobStatus, ProductionJob, UpdateProductionJobDto } from '../../types/production.types';
import { formatDateTime, formatWeight, toTitleCase } from '../../utils/formatters';
import { finishLabel, formatPieces, formatStandardLength } from '../../utils/production';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import JobStatusStepper from './JobStatusStepper';
import ProductionJobForm from './ProductionJobForm';
import QcInspectionPanel from './QcInspectionPanel';

interface JobDetailDrawerProps {
  job: ProductionJob | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated: (updatedJob: ProductionJob) => void;
}

interface RawMaterialOption {
  value: string;
  label: string;
  material_type?: string;
  grade?: string | null;
  quantity_kg?: number;
  reorder_level?: number;
}

interface DieOption {
  value: string;
  label: string;
  condition?: string;
}

const formatValue = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

export default function JobDetailDrawer({
  job,
  isOpen,
  onClose,
  onJobUpdated,
}: JobDetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rawMaterialsForSelect, setRawMaterialsForSelect] = useState<RawMaterialOption[]>([]);
  const [diesForSelect, setDiesForSelect] = useState<DieOption[]>([]);

  const { canManageProduction, canDoQC, isAdmin } = useRoleAccess();
  const { hasPassingInspection } = useQcInspections(job?.id ?? '');

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
    if (!isOpen) {
      return;
    }

    const fetchOptions = async () => {
      try {
        const [rawMaterialResponse, diesResponse] = await Promise.all([
          getRawMaterials({ page: 1, limit: 100 }),
          getDies({ page: 1, limit: 100 }),
        ]);

        setRawMaterialsForSelect(
          rawMaterialResponse.data.map((material) => ({
            value: material.id,
            label: material.grade ? `${material.grade} • ${material.material_type}` : material.material_type,
            material_type: material.material_type,
            grade: material.grade,
            quantity_kg: material.quantity_kg,
            reorder_level: material.reorder_level,
          })),
        );

        setDiesForSelect(
          diesResponse.data.map((die) => ({
            value: die.id,
            label: die.profile_code,
            condition: die.condition,
          })),
        );
      } catch {
        setRawMaterialsForSelect([]);
        setDiesForSelect([]);
      }
    };

    void fetchOptions();
  }, [isOpen]);

  useEffect(() => {
    if (!job) {
      setIsEditOpen(false);
    }
  }, [job]);

  const startedAt = job?.started_at ? formatDateTime(job.started_at) : '—';
  const completedAt = job?.completed_at ? formatDateTime(job.completed_at) : '—';

  const rawMaterialLowStock = useMemo(() => {
    const rawMaterial = job?.raw_material;

    if (!rawMaterial) {
      return false;
    }

    if (!Number.isFinite(rawMaterial.reorder_level)) {
      return false;
    }

    return Number(rawMaterial.quantity_kg) < Number(rawMaterial.reorder_level);
  }, [job?.raw_material]);

  const handleStatusChange = useCallback(
    async (nextStatus: JobStatus) => {
      if (!job) {
        return;
      }

       if (nextStatus === 'completed') {
        const hasOutputQty =
          Number.isFinite(job.output_qty_kg) && Number(job.output_qty_kg) > 0;

        if (!hasOutputQty) {
          toast.error('Set a valid output quantity before completing this job.');
          return;
        }
      }

      setIsStatusUpdating(true);

      try {
        const payload: UpdateProductionJobDto = {
          status: nextStatus,
        };

        if (nextStatus === 'completed' && Number.isFinite(job.output_qty_kg)) {
          payload.output_qty_kg = job.output_qty_kg ?? undefined;
        }

        const updated = await updateProductionJob(job.id, payload);
        onJobUpdated(updated);
        toast.success('Production job status updated.');
      } catch (error) {
        toast.error('Failed to update job status.');
      } finally {
        setIsStatusUpdating(false);
      }
    },
    [job, onJobUpdated],
  );

  const handleDelete = useCallback(async () => {
    if (!job) {
      return;
    }

    try {
      await deleteProductionJob(job.id);
      toast.success('Production job deleted successfully.');
      onClose();
    } catch {
      toast.error('Failed to delete production job.');
    }
  }, [job, onClose]);

  const handleEditSubmit = useCallback(
    async (payload: UpdateProductionJobDto) => {
      if (!job) {
        return;
      }

      setIsSaving(true);

      try {
        const updated = await updateProductionJob(job.id, payload);
        onJobUpdated(updated);
        setIsEditOpen(false);
        toast.success('Production job updated successfully.');
      } catch {
        toast.error('Failed to update production job.');
      } finally {
        setIsSaving(false);
      }
    },
    [job, onJobUpdated],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex justify-end transition-opacity duration-300',
        isVisible ? 'bg-black/50 opacity-100' : 'bg-black/0 opacity-0',
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <aside
        className={clsx(
          'flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        )}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Production Job</p>
            <p className="text-xs text-gray-500">Details & quality control</p>
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
          {!job ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Select a job to view details.
            </div>
          ) : (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-gray-500">#JOB-{job.id.slice(0, 8)}</p>
                    <p className="text-lg font-semibold text-gray-900">{job.die?.profile_code ?? 'Production Job'}</p>
                  </div>
                  <Badge label={toTitleCase(job.process_type)} color="blue" />
                </div>

                <JobStatusStepper
                  currentStatus={job.status}
                  onStatusChange={(nextStatus) => handleStatusChange(nextStatus)}
                  isUpdating={isStatusUpdating}
                  canUpdate={canManageProduction}
                  hasPassingInspection={hasPassingInspection}
                />

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Started: {startedAt}</span>
                  <span>Completed: {completedAt}</span>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Profile</p>
                  <p className="font-mono font-medium text-gray-900">
                    {job.die?.profile_code ?? formatValue(job.die_id)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Section</p>
                  <p className="font-medium text-gray-900">
                    {formatValue(job.die?.product_category)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Process Type</p>
                  <p className="font-medium text-gray-900">{toTitleCase(job.process_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Finish</p>
                  <p className="font-medium text-gray-900">
                    {job.finish_type
                      ? `${job.finish_type} — ${finishLabel(job.finish_type)}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Standard Length</p>
                  <p className="font-medium text-gray-900">
                    {formatStandardLength(job.standard_length_mm)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Output</p>
                  <p className="font-medium text-gray-900">
                    {Number.isFinite(job.output_pcs) ? formatPieces(job.output_pcs) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="font-medium text-gray-900">
                    {job.created_at ? formatDateTime(job.created_at) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900">
                    {job.updated_at ? formatDateTime(job.updated_at) : '—'}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-gray-100 bg-white p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Billet usage
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">Billet Consumed</p>
                    <p className="font-medium text-gray-900">{formatWeight(job.input_qty_kg)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Raw Material</p>
                    <p className="font-medium text-gray-900">
                      {job.raw_material?.grade || job.raw_material?.material_type
                        ? `${job.raw_material?.grade ?? ''} ${job.raw_material?.material_type ?? ''}`.trim()
                        : formatValue(job.material_id)}
                    </p>
                  </div>
                </div>
              </section>

              {job.raw_material ? (
                <section className="rounded-xl border border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      label={toTitleCase(job.raw_material.material_type)}
                      color="amber"
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {job.raw_material.grade ?? 'Unspecified Grade'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Available: {formatWeight(job.raw_material.quantity_kg)}
                  </p>
                  {rawMaterialLowStock ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">Low stock warning</p>
                  ) : null}
                </section>
              ) : null}

              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                <div className="h-px flex-1 bg-gray-200" />
                <span>Quality Control</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <QcInspectionPanel
                jobId={job.id}
                jobStatus={job.status}
                canInspect={canDoQC}
              />
            </div>
          )}
        </div>

        {job ? (
          <footer className="border-t border-gray-100 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {canManageProduction && (job.status === 'pending' || job.status === 'in_progress') ? (
                <button
                  type="button"
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Job Details
                </button>
              ) : (
                <span className="text-xs text-gray-500">No editable actions</span>
              )}

              {isAdmin && job.status === 'pending' ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Job
                </button>
              ) : null}
            </div>
          </footer>
        ) : null}
      </aside>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Production Job"
        size="lg"
      >
        <ProductionJobForm
          initialData={job ?? undefined}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditOpen(false)}
          isSubmitting={isSaving}
          rawMaterialsForSelect={rawMaterialsForSelect}
          diesForSelect={diesForSelect}
        />
      </Modal>
    </div>
  );
}
