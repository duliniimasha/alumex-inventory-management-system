interface BadgeProps {
  label: string;
  color: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple';
}

const toneByColor: Record<BadgeProps['color'], string> = {
  green: 'bg-green-500/15 text-green-700',
  red: 'bg-red-500/15 text-red-700',
  amber: 'bg-amber-500/15 text-amber-700',
  blue: 'bg-blue-500/15 text-blue-700',
  gray: 'bg-gray-500/15 text-gray-700',
  purple: 'bg-purple-500/15 text-purple-700',
};

export default function Badge({ label, color }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneByColor[color]}`}
    >
      {label}
    </span>
  );
}