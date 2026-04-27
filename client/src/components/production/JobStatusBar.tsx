import clsx from 'clsx';
import type { JobStatus } from '../../types/production.types';

interface JobStatusBarProps {
  activeStatus: JobStatus | '';
  statusCounts: Record<JobStatus, number>;
  onStatusChange: (status: JobStatus | '') => void;
}

const chips: Array<{ key: JobStatus | ''; label: string }> = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

export default function JobStatusBar({ activeStatus, statusCounts, onStatusChange }: JobStatusBarProps) {
  const totalCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  const getCount = (key: JobStatus | '') => {
    if (key === '') {
      return totalCount;
    }

    return statusCounts[key] ?? 0;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => {
        const isActive = activeStatus === chip.key;
        const isInProgress = chip.key === 'in_progress';

        return (
          <button
            key={chip.key || 'all'}
            type="button"
            onClick={() => onStatusChange(chip.key)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition',
              isActive
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {isInProgress ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-blue-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
            ) : null}
            <span>{chip.label}</span>
            <span className="text-xs font-semibold">{getCount(chip.key)}</span>
          </button>
        );
      })}
    </div>
  );
}
