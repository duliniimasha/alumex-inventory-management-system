import Badge from '../ui/Badge';
import type { JobStatus } from '../../types/production.types';

interface JobStatusBadgeProps {
  status: JobStatus;
}

const badgeTone: Record<JobStatus, 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple'> = {
  pending: 'gray',
  in_progress: 'blue',
  on_hold: 'amber',
  completed: 'green',
  cancelled: 'red',
};

const labelText: Record<JobStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function JobStatusBadge({ status }: JobStatusBadgeProps) {
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        <Badge label={labelText[status]} color={badgeTone[status]} />
      </span>
    );
  }

  return <Badge label={labelText[status]} color={badgeTone[status]} />;
}
