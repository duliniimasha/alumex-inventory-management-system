import { Eye, MoreVertical, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { RawMaterial } from '../../types/rawMaterial.types';

interface RawMaterialActionsProps {
  row: RawMaterial;
  canEdit: boolean;
  canAdjustQuantity: boolean;
  canDelete: boolean;
  onViewDetails: (material: RawMaterial) => void;
  onEdit: (material: RawMaterial) => void;
  onAdjustQuantity: (material: RawMaterial) => void;
  onDelete: (material: RawMaterial) => void;
}

export default function RawMaterialActions({
  row,
  canEdit,
  canAdjustQuantity,
  canDelete,
  onViewDetails,
  onEdit,
  onAdjustQuantity,
  onDelete,
}: RawMaterialActionsProps) {
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
        aria-label="Raw material actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewDetails(row))}
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>

          {canEdit ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onEdit(row))}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : null}

          {canAdjustQuantity ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onAdjustQuantity(row))}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Adjust Quantity
            </button>
          ) : null}

          {canDelete ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              onClick={() => handleAction(() => onDelete(row))}
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