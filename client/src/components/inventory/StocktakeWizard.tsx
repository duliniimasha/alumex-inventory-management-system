import clsx from 'clsx';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStocktake } from '../../hooks/useStocktake';
import type { InventoryItem, StocktakeResult, WarehouseZone } from '../../types/inventory.types';
import ConfirmDialog from '../ui/ConfirmDialog';

interface StocktakeWizardProps {
  items: InventoryItem[];
  onComplete: (result: StocktakeResult) => void;
  onCancel: () => void;
}

type WizardStep = 1 | 2 | 3;

type StocktakeMode = 'full' | 'zone';

type VarianceRow = {
  id: string;
  sku: string;
  name: string;
  location: string;
  zone: WarehouseZone;
  systemQty: number;
  countedQty: number;
  variance: number;
  variancePercent: number;
};

const steps = [
  { id: 1, label: 'Setup', title: 'Prepare Stocktake' },
  { id: 2, label: 'Count', title: 'Physical Count' },
  { id: 3, label: 'Review & Submit', title: 'Review & Submit' },
] as const;

const zoneOptions: Array<{ value: WarehouseZone; label: string }> = [
  { value: 'main', label: 'Main' },
  { value: 'export', label: 'Export' },
  { value: 'quarantine', label: 'Quarantine' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'returns', label: 'Returns' },
];

const zoneBadgeTone: Record<WarehouseZone, string> = {
  main: 'bg-blue-100 text-blue-700',
  export: 'bg-purple-100 text-purple-700',
  quarantine: 'bg-red-100 text-red-700',
  dispatch: 'bg-green-100 text-green-700',
  returns: 'bg-amber-100 text-amber-700',
};

function calculateVariancePercent(systemQty: number, countedQty: number) {
  if (systemQty === 0) {
    return countedQty === 0 ? 0 : 100;
  }

  return (Math.abs(countedQty - systemQty) / systemQty) * 100;
}

export default function StocktakeWizard({ items, onComplete, onCancel }: StocktakeWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<StocktakeMode>('full');
  const [zoneFilter, setZoneFilter] = useState<WarehouseZone>('main');
  const [startWithSystem, setStartWithSystem] = useState(false);
  const [search, setSearch] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const {
    entries,
    isSubmitting,
    result,
    error,
    setCount,
    removeEntry,
    clearAll,
    submit,
    importFromTable,
  } = useStocktake();

  const filteredItems = useMemo(() => {
    if (mode === 'zone') {
      return items.filter((item) => item.warehouse_zone === zoneFilter);
    }

    return items;
  }, [items, mode, zoneFilter]);

  const filteredItemIds = useMemo(
    () => new Set(filteredItems.map((item) => item.id)),
    [filteredItems],
  );

  const entryCount = useMemo(() => {
    let count = 0;
    entries.forEach((_value, key) => {
      if (filteredItemIds.has(key)) {
        count += 1;
      }
    });
    return count;
  }, [entries, filteredItemIds]);

  const totalItems = filteredItems.length;
  const progressPercent = totalItems > 0 ? Math.min((entryCount / totalItems) * 100, 100) : 0;

  const countedItems = useMemo(() => {
    if (!search.trim()) {
      return filteredItems;
    }

    const query = search.trim().toLowerCase();

    return filteredItems.filter((item) => {
      const sku = item.product?.sku?.toLowerCase() ?? '';
      const location = item.location_code.toLowerCase();
      return sku.includes(query) || location.includes(query);
    });
  }, [filteredItems, search]);

  const varianceRows = useMemo(() => {
    const rows: VarianceRow[] = [];

    filteredItems.forEach((item) => {
      const counted = entries.get(item.id);

      if (counted === undefined) {
        return;
      }

      const systemQty = item.quantity;
      const variance = counted - systemQty;
      const variancePercent = calculateVariancePercent(systemQty, counted);

      if (variance === 0) {
        return;
      }

      rows.push({
        id: item.id,
        sku: item.product?.sku ?? 'UNKNOWN',
        name: item.product?.name ?? 'Unknown Product',
        location: item.location_code,
        zone: item.warehouse_zone,
        systemQty,
        countedQty: counted,
        variance,
        variancePercent,
      });
    });

    return rows.sort((left, right) => Math.abs(right.variancePercent) - Math.abs(left.variancePercent));
  }, [entries, filteredItems]);

  const flaggedForReviewCount = useMemo(
    () => varianceRows.filter((row) => row.variancePercent > 2).length,
    [varianceRows],
  );

  const skippedCount = Math.max(totalItems - entryCount, 0);

  useEffect(() => {
    if (step !== 1) {
      return;
    }

    clearAll();
  }, [clearAll, mode, step, zoneFilter]);

  useEffect(() => {
    if (step !== 1 || !startWithSystem) {
      return;
    }

    importFromTable(filteredItems);
  }, [filteredItems, importFromTable, startWithSystem, step]);

  const handleBeginCount = useCallback(() => {
    if (startWithSystem) {
      importFromTable(filteredItems);
    }

    setStep(2);
  }, [filteredItems, importFromTable, startWithSystem]);

  const handleSubmit = useCallback(async () => {
    const success = await submit();

    if (success) {
      setIsConfirmOpen(false);
    }
  }, [submit]);

  const handleDone = useCallback(() => {
    if (result) {
      onComplete(result);
    }
  }, [onComplete, result]);

  if (result) {
    const flaggedItems = result.discrepancies.filter((item) => item.flagged_for_review);

    return (
      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
          <h2 className="text-lg font-semibold text-gray-900">Stocktake Complete</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Processed</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{result.processed}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Matched</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{result.no_variance_count}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Flagged</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{result.flagged_count}</p>
          </div>
        </div>

        {flaggedItems.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-700">Flagged Items</h3>
            <div className="mt-3 space-y-2 text-sm text-red-800">
              {flaggedItems.map((item) => (
                <div key={item.item_id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{item.product_name}</span>
                  <span className="text-xs text-red-700">{item.location_code}</span>
                  <span className="text-xs">
                    Variance: {item.variance} ({item.variance_percent.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex min-w-[120px] items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {steps.map((stepItem, index) => {
            const isActive = step === stepItem.id;
            const isComplete = step > stepItem.id;

            return (
              <div key={stepItem.id} className="flex items-center gap-3">
                <div
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold',
                    isComplete
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isActive
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-gray-100 text-gray-500',
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : stepItem.id}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Step {stepItem.id}</p>
                  <p className={clsx('text-sm font-semibold', isActive ? 'text-gray-900' : 'text-gray-500')}>
                    {stepItem.label}
                  </p>
                </div>
                {index < steps.length - 1 ? <div className="h-px w-8 bg-gray-200" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <section className="space-y-6">
          <header>
            <h2 className="text-xl font-semibold text-gray-900">Prepare Stocktake</h2>
            <p className="mt-2 text-sm text-gray-600">
              Compare physical stock counts against system records. Discrepancies greater than 2% will be flagged for
              supervisor review.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={clsx(
                'rounded-xl border p-4 text-left transition',
                mode === 'full'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-amber-200',
              )}
            >
              <h3 className="text-base font-semibold text-gray-900">Full Stocktake</h3>
              <p className="mt-1 text-sm text-gray-600">Counts all items in inventory.</p>
              <p className="mt-3 text-sm font-semibold text-gray-700">{items.length} items to count</p>
            </button>

            <button
              type="button"
              onClick={() => setMode('zone')}
              className={clsx(
                'rounded-xl border p-4 text-left transition',
                mode === 'zone'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-amber-200',
              )}
            >
              <h3 className="text-base font-semibold text-gray-900">Zone Stocktake</h3>
              <p className="mt-1 text-sm text-gray-600">Count items in a single warehouse zone.</p>

              {mode === 'zone' ? (
                <div className="mt-3">
                  <select
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                    value={zoneFilter}
                    onChange={(event) => setZoneFilter(event.target.value as WarehouseZone)}
                  >
                    {zoneOptions.map((zone) => (
                      <option key={zone.value} value={zone.value}>
                        {zone.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    {filteredItems.length} items in {zoneFilter} zone
                  </p>
                </div>
              ) : null}
            </button>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
              checked={startWithSystem}
              onChange={(event) => setStartWithSystem(event.target.checked)}
            />
            <span>Start with system quantities</span>
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBeginCount}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Begin Count
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <header>
            <h2 className="text-xl font-semibold text-gray-900">Physical Count</h2>
            <p className="mt-2 text-sm text-gray-600">{entryCount} of {totalItems} items counted</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </header>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by SKU or location"
              className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            />
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
            {countedItems.length === 0 ? (
              <p className="text-sm text-gray-500">No items found for this search.</p>
            ) : (
              countedItems.map((item) => {
                const counted = entries.get(item.id);
                const hasEntry = counted !== undefined;
                const variance = hasEntry ? counted - item.quantity : 0;
                const hasVariance = hasEntry && variance !== 0;

                return (
                  <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {item.product?.sku ?? 'UNKNOWN'}
                          </span>
                          <span className="text-sm text-gray-700">{item.product?.name ?? 'Unknown Product'}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {item.location_code}
                          </span>
                          <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', zoneBadgeTone[item.warehouse_zone])}>
                            {item.warehouse_zone}
                          </span>
                          <span className="text-xs text-gray-500">System: {item.quantity}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <input
                            type="number"
                            step="any"
                            value={hasEntry ? counted : ''}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === '') {
                                removeEntry(item.id);
                                return;
                              }

                              const numeric = Number(value);
                              if (Number.isFinite(numeric)) {
                                setCount(item.id, numeric);
                              }
                            }}
                            className={clsx(
                              'h-10 w-28 rounded-lg border px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50',
                              hasVariance ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-white',
                            )}
                          />
                          {hasVariance ? (
                            <span className={clsx('text-xs font-semibold', variance > 0 ? 'text-emerald-600' : 'text-red-600')}>
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEntry(item.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {entryCount}/{totalItems} counted
              </p>
              {skippedCount > 0 ? (
                <p className="text-xs text-amber-700">
                  {skippedCount} items not counted will be skipped
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={entryCount === 0}
                className="inline-flex min-w-[140px] items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Next: Review
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <header>
            <h2 className="text-xl font-semibold text-gray-900">Review & Submit</h2>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Items to submit</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{entryCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Items skipped</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{skippedCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Variances detected</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{varianceRows.length}</p>
            </div>
          </div>

          {varianceRows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">System Qty</th>
                    <th className="px-4 py-3 text-left">Counted Qty</th>
                    <th className="px-4 py-3 text-left">Variance</th>
                    <th className="px-4 py-3 text-left">Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceRows.map((row) => (
                    <tr
                      key={row.id}
                      className={clsx(
                        'border-t border-gray-100',
                        row.variancePercent > 2 ? 'bg-red-50' : 'bg-white',
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-gray-900">{row.sku}</td>
                      <td className="px-4 py-3 text-gray-700">{row.location}</td>
                      <td className="px-4 py-3 text-gray-700">{row.systemQty}</td>
                      <td className="px-4 py-3 text-gray-700">{row.countedQty}</td>
                      <td className={clsx('px-4 py-3 font-semibold', row.variance > 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {row.variance > 0 ? `+${row.variance}` : row.variance}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.variancePercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                {flaggedForReviewCount} items will be flagged for supervisor review
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={entryCount === 0}
              className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              Submit Stocktake
            </button>
          </div>

          <ConfirmDialog
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={handleSubmit}
            title="Submit Stocktake"
            message={`Submit ${entryCount} count entries? This will create stock adjustment records for all discrepancies.`}
            confirmLabel="Submit"
            variant="warning"
          />
        </section>
      ) : null}
    </div>
  );
}
