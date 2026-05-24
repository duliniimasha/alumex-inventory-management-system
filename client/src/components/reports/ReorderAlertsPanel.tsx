import { AlertTriangle, Download, Mail } from 'lucide-react';
import type { ReorderAlertsReport } from '../../types/reports.types';
import { formatNumber, formatWeight, toTitleCase } from '../../utils/formatters';
import Badge from '../ui/Badge';
import DataTable, { type Column } from '../ui/DataTable';

interface ReorderAlertsPanelProps {
  data: ReorderAlertsReport | null;
  isLoading: boolean;
  onExport?: () => void;
}

type AlertRow = ReorderAlertsReport['alerts'][number];

function buildMailto(alert: AlertRow): string {
  const descriptor = [alert.grade ?? '', alert.material_type].filter(Boolean).join(' ').trim();
  const subject = descriptor
    ? `Purchase Order Request - ${descriptor}`
    : 'Purchase Order Request';

  return `mailto:${alert.supplier.contact_email}?subject=${encodeURIComponent(subject)}`;
}

export default function ReorderAlertsPanel({ data, isLoading, onExport }: ReorderAlertsPanelProps) {
  const alerts = data?.alerts ?? [];
  const totalAlerts = data?.total_alerts ?? 0;

  const columns: Column<AlertRow>[] = [
    {
      key: 'material_type',
      header: 'Material Type',
      render: (row) => <Badge label={toTitleCase(row.material_type)} color="blue" />,
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => row.grade ?? 'N/A',
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (row) => row.supplier.name,
    },
    {
      key: 'current_qty',
      header: 'Current Qty',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-red-600">{formatWeight(row.current_qty)}</span>
      ),
    },
    {
      key: 'reorder_level',
      header: 'Reorder Level',
      sortable: true,
      render: (row) => formatWeight(row.reorder_level),
    },
    {
      key: 'shortage',
      header: 'Shortage',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-red-600">-{formatWeight(row.shortage)}</span>
      ),
    },
    {
      key: 'shortage_percent',
      header: 'Shortage %',
      sortable: true,
      render: (row) => (
        <Badge label={`${formatNumber(row.shortage_percent, 1)}%`} color="red" />
      ),
    },
    {
      key: 'supplier_email',
      header: 'Supplier Email',
      render: (row) => (
        <a
          href={`mailto:${row.supplier.contact_email}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          {row.supplier.contact_email}
        </a>
      ),
    },
    {
      key: 'contact_action',
      header: 'Contact',
      render: (row) => (
        <a
          href={buildMailto(row)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          <Mail className="h-3.5 w-3.5" />
          Contact Supplier
        </a>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Reorder Alerts</h3>
          <p className="text-sm text-gray-500">Materials below reorder level.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onExport}
          disabled={!onExport || isLoading || alerts.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {totalAlerts > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {totalAlerts} materials require immediate reordering
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={alerts}
        isLoading={isLoading}
        emptyMessage="No reorder alerts available."
      />
    </section>
  );
}
