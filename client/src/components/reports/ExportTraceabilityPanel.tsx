import { ChevronDown, Factory, GitBranch, Package, Search, ShoppingCart, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import type { ExportTraceabilityReport } from '../../types/reports.types';
import { formatDate, formatNumber, toTitleCase } from '../../utils/formatters';
import { getQcResultColor } from '../../utils/production.utils';
import { getCountryEmoji } from '../../utils/sales.utils';
import Badge from '../ui/Badge';

interface ExportTraceabilityPanelProps {
  data: ExportTraceabilityReport | null;
  isLoading: boolean;
  onSearch: (orderId: string) => void;
  isSearching: boolean;
}

interface TraceItemProps {
  icon: LucideIcon;
  tone: string;
  title: string;
  children?: ReactNode;
}

function TraceItem({ icon: Icon, tone, title, children }: TraceItemProps) {
  return (
    <div className="relative pl-8">
      <span className={`absolute -left-3 top-0 flex h-7 w-7 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {children ? <div className="mt-1 space-y-1 text-sm text-gray-600">{children}</div> : null}
      </div>
    </div>
  );
}

const qcResultLabel: Record<'pass' | 'hold' | 'reject', string> = {
  pass: 'Pass',
  hold: 'Hold',
  reject: 'Reject',
};

export default function ExportTraceabilityPanel({
  data,
  isLoading,
  onSearch,
  isSearching,
}: ExportTraceabilityPanelProps) {
  const [orderId, setOrderId] = useState('');
  const [openLineIds, setOpenLineIds] = useState<string[]>([]);

  useEffect(() => {
    if (data?.lines?.length) {
      setOpenLineIds([data.lines[0].line_id]);
    }
  }, [data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = orderId.trim();
    if (!trimmed) {
      return;
    }

    onSearch(trimmed);
  };

  const toggleLine = (lineId: string) => {
    setOpenLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
    );
  };

  const orderStatus = useMemo(() => {
    const status = (data as ExportTraceabilityReport & { status?: string })?.status;
    return status ? toTitleCase(status) : 'Unknown';
  }, [data]);

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            placeholder="Enter export order ID..."
            className="w-full bg-transparent text-sm text-gray-900 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Search className="h-4 w-4" />
          Trace
        </button>
      </form>

      {!isLoading && !data ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-gray-500">
          <GitBranch className="h-8 w-8" />
          <p className="text-sm font-medium">Enter an export order ID to view the full supply chain trace</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Order Ref</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{data.order_ref}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Customer</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {data.customer.name}{' '}
                  <span className="text-lg" aria-hidden="true">
                    {getCountryEmoji(data.customer.country)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Dispatch Date</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {data.dispatch_date ? formatDate(data.dispatch_date) : 'Pending'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{orderStatus}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {data.lines.map((line) => {
              const isOpen = openLineIds.includes(line.line_id);
              const inventoryItem = line.inventory_item;
              const productionJob = inventoryItem?.production_job ?? null;
              const rawMaterial = productionJob?.raw_material ?? null;

              const qcCounts = productionJob?.qc_inspections?.reduce(
                (acc, inspection) => {
                  if (inspection.result === 'pass' || inspection.result === 'hold' || inspection.result === 'reject') {
                    acc[inspection.result] += 1;
                  }
                  return acc;
                },
                { pass: 0, hold: 0, reject: 0 },
              );

              const qcBadges = qcCounts
                ? (['pass', 'hold', 'reject'] as const)
                    .filter((key) => qcCounts[key] > 0)
                    .map((key) => (
                      <Badge
                        key={key}
                        label={`${qcResultLabel[key]} ${qcCounts[key]}`}
                        color={getQcResultColor(key)}
                      />
                    ))
                : [];

              return (
                <div key={line.line_id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleLine(line.line_id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {line.product_sku} - {line.product_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Qty dispatched: {formatNumber(line.qty_dispatched)}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-gray-100 px-4 py-5">
                      <div className="relative space-y-6 border-l border-dashed border-gray-200 pl-6">
                        <TraceItem
                          icon={ShoppingCart}
                          tone="bg-amber-100 text-amber-600"
                          title={`Order Line: ${formatNumber(line.qty_dispatched)} units of ${line.product_sku}`}
                        />

                        <TraceItem
                          icon={Warehouse}
                          tone="bg-blue-100 text-blue-600"
                          title="Inventory Item"
                        >
                          {inventoryItem ? (
                            <>
                              <p>Location: {inventoryItem.warehouse_zone} / {inventoryItem.location_code}</p>
                              <p>Received: {formatDate(inventoryItem.received_at)}</p>
                            </>
                          ) : (
                            <p className="text-gray-400">Not linked</p>
                          )}
                        </TraceItem>

                        <TraceItem
                          icon={Factory}
                          tone="bg-purple-100 text-purple-600"
                          title="Production Job"
                        >
                          {productionJob ? (
                            <>
                              <p>
                                Process: {toTitleCase(productionJob.process_type)} | Completed:{' '}
                                {productionJob.completed_at ? formatDate(productionJob.completed_at) : 'Pending'}
                              </p>
                              {qcBadges.length > 0 ? (
                                <div className="flex flex-wrap gap-2">{qcBadges}</div>
                              ) : (
                                <p className="text-gray-400">No QC results</p>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-400">Not linked</p>
                          )}
                        </TraceItem>

                        <TraceItem
                          icon={Package}
                          tone="bg-emerald-100 text-emerald-600"
                          title="Raw Material"
                        >
                          {rawMaterial ? (
                            <>
                              <p>
                                Material: {rawMaterial.grade ?? ''} {rawMaterial.material_type}
                              </p>
                              <p>
                                Supplier: {rawMaterial.supplier.name}, {rawMaterial.supplier.country}
                              </p>
                              <p>Certification: {rawMaterial.supplier.certification ?? 'None'}</p>
                            </>
                          ) : (
                            <p className="text-gray-400">Not linked</p>
                          )}
                        </TraceItem>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
