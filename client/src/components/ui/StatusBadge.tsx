import Badge from './Badge';

interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
}

const configByStatus: Record<
  StatusBadgeProps['status'],
  { label: string; color: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' }
> = {
  pending: { label: 'Pending', color: 'amber' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  on_hold: { label: 'On Hold', color: 'red' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, color } = configByStatus[status];

  return <Badge label={label} color={color} />;
}
