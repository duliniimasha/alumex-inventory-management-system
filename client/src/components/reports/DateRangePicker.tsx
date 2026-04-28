import clsx from 'clsx';
import { Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns';
import type { ReportDateRange } from '../../types/reports.types';

type PresetKey =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';

type PeriodOption = 'daily' | 'weekly' | 'monthly';

const PRESET_OPTIONS: Array<{ key: PresetKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'this_year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

const PERIOD_OPTIONS: Array<{ key: PeriodOption; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export function formatReportDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getPresetRange(key: PresetKey, today: Date) {
  switch (key) {
    case 'today': {
      return { from: today, to: today };
    }
    case 'this_week': {
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    }
    case 'this_month': {
      return { from: startOfMonth(today), to: endOfMonth(today) };
    }
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'last_3_months': {
      return {
        from: startOfMonth(subMonths(today, 2)),
        to: endOfMonth(today),
      };
    }
    case 'this_year': {
      return { from: startOfYear(today), to: endOfYear(today) };
    }
    default:
      return null;
  }
}

function getMatchingPreset(value: ReportDateRange, today: Date): PresetKey {
  const fromDate = value.from_date;
  const toDate = value.to_date;

  for (const preset of PRESET_OPTIONS) {
    if (preset.key === 'custom') {
      continue;
    }

    const range = getPresetRange(preset.key, today);

    if (
      range &&
      fromDate === formatReportDate(range.from) &&
      toDate === formatReportDate(range.to)
    ) {
      return preset.key;
    }
  }

  return 'custom';
}

interface DateRangePickerProps {
  value: ReportDateRange;
  onChange: (range: ReportDateRange) => void;
  showPeriodSelect?: boolean;
  disabled?: boolean;
}

export default function DateRangePicker({
  value,
  onChange,
  showPeriodSelect = false,
  disabled = false,
}: DateRangePickerProps) {
  const today = useMemo(() => new Date(), []);
  const derivedPreset = useMemo(
    () => getMatchingPreset(value, today),
    [today, value],
  );
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(derivedPreset);

  useEffect(() => {
    if (selectedPreset !== 'custom') {
      setSelectedPreset(derivedPreset);
    }
  }, [derivedPreset, selectedPreset]);

  const isCustom = selectedPreset === 'custom';
  const selectedPeriod = value.period ?? 'daily';

  const handlePresetChange = (key: PresetKey) => {
    setSelectedPreset(key);

    if (key === 'custom') {
      return;
    }

    const range = getPresetRange(key, today);

    if (!range) {
      return;
    }

    onChange({
      from_date: formatReportDate(range.from),
      to_date: formatReportDate(range.to),
      period: value.period,
    });
  };

  const handleDateInputChange = (field: 'from_date' | 'to_date', nextValue: string) => {
    setSelectedPreset('custom');
    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const handlePeriodChange = (period: PeriodOption) => {
    onChange({
      ...value,
      period,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_OPTIONS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            disabled={disabled}
            onClick={() => handlePresetChange(preset.key)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              selectedPreset === preset.key
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showPeriodSelect ? (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => handlePeriodChange(option.key)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                selectedPeriod === option.key
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:text-gray-900',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {isCustom ? (
        <div className="grid gap-3 md:grid-cols-2">
          {(['from_date', 'to_date'] as const).map((field) => (
            <label
              key={field}
              className="relative flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={value[field] ?? ''}
                disabled={disabled}
                onChange={(event) => handleDateInputChange(field, event.target.value)}
                className="w-full bg-transparent text-sm text-gray-700 focus:outline-none"
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
