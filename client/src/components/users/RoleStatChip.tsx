import clsx from 'clsx';
import type { RoleSlug } from '../../types/user.types';
import { toTitleCase } from '../../utils/formatters';

interface RoleStatChipProps {
  role: RoleSlug;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

export default function RoleStatChip({ role, count, isActive, onClick }: RoleStatChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        isActive
          ? 'border-amber-400 bg-amber-50 text-amber-700'
          : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200',
      )}
    >
      <span>{toTitleCase(role)}</span>
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
        {count}
      </span>
    </button>
  );
}
