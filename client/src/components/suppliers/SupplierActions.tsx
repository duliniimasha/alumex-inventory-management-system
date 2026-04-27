import { Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { Supplier } from '../../types/supplier.types';

interface SupplierActionsProps {
  supplier: Supplier;
  canManageSuppliers: boolean;
  isAdmin: boolean;
  onViewDetails: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export default function SupplierActions({
  supplier,
  canManageSuppliers,
  isAdmin,
  onViewDetails,
  onEdit,
  onDelete,
}: SupplierActionsProps) {
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
        aria-label="Supplier actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div className="absolute top-full right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => handleAction(() => onViewDetails(supplier))}
          >
            <Eye className="h-4 w-4" />
            View Details
          </button>

          {canManageSuppliers ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => handleAction(() => onEdit(supplier))}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : null}

          {isAdmin ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              onClick={() => handleAction(() => onDelete(supplier))}
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