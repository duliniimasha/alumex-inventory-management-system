interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
}

const toneByStatus: Record<StatusBadgeProps['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-red-100 text-red-800',
};

const labelByStatus: Record<StatusBadgeProps['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneByStatus[status]}`}
    >
      {labelByStatus[status]}
    </span>
  );
}
