import { Eye, MoreVertical, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { ProductionJob } from '../../types/production.types';

interface ProductionJobActionsProps {
  job: ProductionJob;
  canManageProduction: boolean;
  canDoQC: boolean;
  isAdmin: boolean;
  onViewDetails: (job: ProductionJob) => void;
  onStartJob: (job: ProductionJob) => void;
  onAddInspection: (job: ProductionJob) => void;
  onEdit: (job: ProductionJob) => void;
  onDelete: (job: ProductionJob) => void;
}

export default function ProductionJobActions({
  job,
  canManageProduction,
  canDoQC,
  isAdmin,
  onViewDetails,
  onStartJob,
  onAddInspection,
  onEdit,
  onDelete,
}: ProductionJobActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  const isPending = job.status === 'pending';
  const isInProgress = job.status === 'in_progress';
  const canEdit = canManageProduction && (isPending || isInProgress);

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Production job actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewDetails(job))}
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>

          {canManageProduction && isPending ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onStartJob(job))}
            >
              <Play className="h-4 w-4" />
              Start Job
            </button>
          ) : null}

          {canDoQC && isInProgress ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onAddInspection(job))}
            >
              <Plus className="h-4 w-4" />
              Add QC Inspection
            </button>
          ) : null}

          {canEdit ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onEdit(job))}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : null}

          {isAdmin && isPending ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              onClick={() => handleAction(() => onDelete(job))}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
