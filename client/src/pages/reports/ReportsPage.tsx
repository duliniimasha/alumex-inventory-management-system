import { Download, FileSpreadsheet, Loader2, Users, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle, useReports, useRoleAccess } from '../../hooks';
import type { ReportKind } from '../../hooks/useReports';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';

type ReportCard = {
  kind: ReportKind;
  title: string;
  description: string;
  icon: LucideIcon;
  sheets: string[];
  roles: string[];
};

const reportCards: ReportCard[] = [
  {
    kind: 'customers',
    title: 'Customers — Detailed Report',
    description:
      'A full Excel workbook covering every customer: profile, complete order history and line-level detail with revenue figures.',
    icon: Users,
    sheets: [
      'Customers — profile, order count, ordered / dispatched / outstanding value',
      'Orders — every order with channel, status, dates and value',
      'Order Lines — product, quantity ordered & dispatched, unit price, line value',
    ],
    roles: [
      'system_admin',
      'management_viewer',
      'sales_executive',
      'export_coordinator',
    ],
  },
  {
    kind: 'suppliers',
    title: 'Suppliers — Detailed Report',
    description:
      'A full Excel workbook covering every supplier: profile, raw materials supplied with reorder status and production usage.',
    icon: Truck,
    sheets: [
      'Suppliers — profile, material count, total quantity, items below reorder',
      'Raw Materials — category, type, grade, quantity, reorder level, shortfall',
      'Production Usage — jobs using each supplier’s material with yield & QC status',
    ],
    roles: ['system_admin', 'management_viewer', 'procurement_officer'],
  },
];

export default function ReportsPage() {
  usePageTitle('Reports & Analytics');

  const { currentRole } = useRoleAccess();
  const { exporting, exportCustomers, exportSuppliers } = useReports();

  const handlers: Record<ReportKind, () => void> = {
    customers: exportCustomers,
    suppliers: exportSuppliers,
  };

  const availableCards = reportCards.filter((card) =>
    card.roles.includes(currentRole),
  );

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Export detailed Excel reports for each company"
        breadcrumbs={[{ label: 'Reports', path: '/reports' }]}
      />

      {availableCards.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10">
          <EmptyState
            icon={FileSpreadsheet}
            title="No reports available"
            description="No reports are available for your role."
          />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {availableCards.map((card) => {
            const Icon = card.icon;
            const isExporting = exporting === card.kind;
            const isBusy = exporting !== null;

            return (
              <div
                key={card.kind}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {card.title}
                  </h2>
                </div>

                <p className="mt-3 text-sm text-gray-500">{card.description}</p>

                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  {card.sheets.map((sheet) => (
                    <li key={sheet} className="flex gap-2">
                      <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <span>{sheet}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={handlers[card.kind]}
                  disabled={isBusy}
                  className="mt-6 inline-flex items-center justify-center gap-2 self-start rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isExporting ? 'Generating…' : 'Export to Excel'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
