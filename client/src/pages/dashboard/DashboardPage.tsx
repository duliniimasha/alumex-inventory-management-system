import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardPlus,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';

const skeletonStatuses: Array<'pending' | 'in_progress' | 'completed' | 'on_hold'> = [
  'pending',
  'in_progress',
  'completed',
  'on_hold',
  'pending',
];

const quickActionCatalog = [
  {
    label: 'New Order',
    icon: ClipboardPlus,
    key: 'new-order',
  },
  {
    label: 'Receive Stock',
    icon: Truck,
    key: 'receive-stock',
  },
  {
    label: 'Run Stocktake',
    icon: Boxes,
    key: 'run-stocktake',
  },
  {
    label: 'View Reports',
    icon: BarChart3,
    key: 'view-reports',
  },
] as const;

function DashboardContent() {
  usePageTitle('Dashboard');
  const {
    canCreateOrders,
    canDispatch,
    canManageProduction,
    canViewReports,
    isReadOnly,
  } = useRoleAccess();

  const quickActions = quickActionCatalog.filter((action) => {
    if (action.key === 'new-order') {
      return canCreateOrders;
    }

    if (action.key === 'receive-stock') {
      return canDispatch;
    }

    if (action.key === 'run-stocktake') {
      return canManageProduction || (!isReadOnly && canDispatch);
    }

    if (action.key === 'view-reports') {
      return canViewReports;
    }

    return false;
  });

  return (
    <div className="space-y-6">
      {/* TODO: Wire KPI data from GET /dashboard/kpis endpoint. */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title="Total SKUs"
          value="—"
          subtitle="Across all warehouses"
          icon={Package}
          color="amber"
        />
        <StatCard
          title="Stock Value (LKR)"
          value="—"
          subtitle="Current estimated stock worth"
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Pending Orders"
          value="—"
          subtitle="Orders awaiting fulfillment"
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Reorder Alerts"
          value="—"
          subtitle="Items below reorder level"
          icon={AlertTriangle}
          color="red"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* TODO: Wire production jobs from GET /production/jobs?limit=5 endpoint. */}
        <article className="rounded-xl bg-white shadow-sm lg:col-span-2">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Production Jobs</h2>
            <button
              type="button"
              className="text-sm font-medium text-amber-600 transition hover:text-amber-700"
            >
              View all
            </button>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Job ID</th>
                  <th className="px-5 py-3 font-semibold">Process Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Material</th>
                  <th className="px-5 py-3 font-semibold">Started</th>
                </tr>
              </thead>
              <tbody>
                {skeletonStatuses.map((status, index) => (
                  <tr key={`job-skeleton-${status}-${index}`} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="h-3 w-14 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-4">
          {/* TODO: Wire low stock alerts from GET /inventory/reorder-alerts endpoint. */}
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <header className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-semibold text-gray-800">Low Stock Alerts</h2>
            </header>

            <ul className="space-y-3">
              <li className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/40 p-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Aluminium Billet 6063</p>
                  <p className="text-xs text-gray-500">Current: 120 kg · Reorder: 300 kg</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/40 p-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Powder Coating - White Matte</p>
                  <p className="text-xs text-gray-500">Current: 18 kg · Reorder: 50 kg</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/40 p-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Packaging Sleeve - 3m</p>
                  <p className="text-xs text-gray-500">Current: 240 pcs · Reorder: 500 pcs</p>
                </div>
              </li>
            </ul>
          </article>

          {/* TODO: Wire quick-action enablement from role-based permissions endpoint if needed. */}
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-gray-800">Quick Actions</h2>
            </header>

            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.key}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-amber-400 hover:text-amber-700"
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
