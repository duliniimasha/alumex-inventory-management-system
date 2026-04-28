import { useEffect, useState } from 'react';

type ProgressColor = 'green' | 'amber' | 'red' | 'blue';

interface StatProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: ProgressColor;
  formatter?: (val: number) => string;
  showPercentage?: boolean;
}

const fillColorByTone: Record<ProgressColor, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};

const defaultFormatter = (value: number) => new Intl.NumberFormat('en-US').format(value);

export default function StatProgressBar({
  label,
  value,
  maxValue,
  color,
  formatter = defaultFormatter,
  showPercentage = true,
}: StatProgressBarProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeMax = maxValue > 0 ? maxValue : 1;
  const rawPercent = (value / safeMax) * 100;
  const percentage = Math.min(Math.max(rawPercent, 0), 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{formatter(value)}</span>
      </div>

      <div className="relative mt-2 h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-[width] duration-700 ease-out ${fillColorByTone[color]}`}
          style={{ width: isMounted ? `${percentage}%` : '0%' }}
        />
        {showPercentage ? (
          <span className="absolute right-0 -top-5 text-xs font-medium text-gray-500">
            {Math.round(percentage)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
