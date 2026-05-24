import type { LucideIcon } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    iconWrap: 'p-2',
    icon: 'h-4 w-4',
    title: 'text-sm',
    description: 'text-xs',
    action: 'px-3 py-1.5 text-xs',
    spacing: 'gap-1.5',
  },
  md: {
    iconWrap: 'p-3',
    icon: 'h-5 w-5',
    title: 'text-base',
    description: 'text-sm',
    action: 'px-4 py-2 text-sm',
    spacing: 'gap-2',
  },
  lg: {
    iconWrap: 'p-4',
    icon: 'h-6 w-6',
    title: 'text-lg',
    description: 'text-sm',
    action: 'px-5 py-2.5 text-sm',
    spacing: 'gap-2.5',
  },
} as const;

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  const styles = sizeStyles[size];
  const ActionIcon = action?.icon;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${styles.spacing}`}>
      <div className={`rounded-full bg-gray-100 text-gray-500 ${styles.iconWrap}`}>
        <Icon className={styles.icon} />
      </div>
      <p className={`font-semibold text-gray-700 ${styles.title}`}>{title}</p>
      {description ? (
        <p className={`text-gray-500 ${styles.description}`}>{description}</p>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className={`inline-flex items-center gap-2 rounded-lg bg-amber-500 font-semibold text-white transition hover:bg-amber-600 ${styles.action}`}
        >
          {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
