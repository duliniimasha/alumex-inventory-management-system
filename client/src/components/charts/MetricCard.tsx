import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

type MetricCardColor = 'amber' | 'blue' | 'green' | 'red' | 'purple';

type MetricCardSize = 'sm' | 'md';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  icon: LucideIcon;
  color: MetricCardColor;
  isLoading?: boolean;
  size?: MetricCardSize;
}

const iconToneByColor: Record<MetricCardColor, string> = {
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

const sizeStyles: Record<MetricCardSize, { padding: string; title: string; value: string }> = {
  sm: { padding: 'p-4', title: 'text-xs', value: 'text-xl' },
  md: { padding: 'p-5', title: 'text-sm', value: 'text-2xl' },
};

export default function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  isLoading = false,
  size = 'md',
}: MetricCardProps) {
  const styles = sizeStyles[size];

  return (
    <article className={`rounded-xl bg-white shadow-sm ${styles.padding}`}>
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded-full bg-gray-100" />
          <div className="h-6 w-32 rounded-full bg-gray-100" />
          <div className="h-4 w-24 rounded-full bg-gray-100" />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`font-medium text-gray-600 ${styles.title}`}>{title}</p>
            <p className={`mt-3 font-bold text-gray-900 ${styles.value}`}>{value}</p>

            {change ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${
                    change.isPositive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {change.isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {Math.abs(change.value)}%
                </span>
                <span>{change.label}</span>
              </div>
            ) : null}
          </div>

          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconToneByColor[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      )}
    </article>
  );
}
