import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

type StatCardColor = 'amber' | 'blue' | 'green' | 'red' | 'purple';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: StatCardColor;
}

const iconToneByColor: Record<StatCardColor, string> = {
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
}: StatCardProps) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
        </div>

        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconToneByColor[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{subtitle}</p>

        {trend ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {trend.isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend.value}%
          </span>
        ) : null}
      </div>
    </article>
  );
}
