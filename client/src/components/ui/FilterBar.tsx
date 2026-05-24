import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  onReset: () => void;
  activeFilterCount: number;
}

export default function FilterBar({ children, onReset, activeFilterCount }: FilterBarProps) {
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {children}

        {hasActiveFilters ? (
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {activeFilterCount}
            </span>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              onClick={onReset}
            >
              <X className="h-4 w-4" />
              <span>Reset filters</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}