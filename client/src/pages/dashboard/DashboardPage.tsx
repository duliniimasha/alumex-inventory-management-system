import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ClipboardPlus,
  DollarSign,
  Factory,
  Package,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useOrders } from '../../hooks/useOrders';
import { useProductionJobs } from '../../hooks/useProductionJobs';
import { useRawMaterials } from '../../hooks/useRawMaterials';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useInventory } from '../../hooks/useInventory';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { getProducts } from '../../api/inventory.api';
import { formatDate, formatNumber, toTitleCase } from '../../utils/formatters';

const skeletonStatuses: Array<'pending' | 'in_progress' | 'completed' | 'on_hold'> = [
  'pending',
  'in_progress',
  'completed',
  'on_hold',
  'pending',
];

function DashboardContent() {
  usePageTitle('Dashboard');
  const navigate = useNavigate();
  const {
    canCreateOrders,
    canDispatch,
    canManageProduction,
    canViewReports,
    canDoQC,
    isAdmin,
  } = useRoleAccess();
  const { stats, isStatsLoading } = useOrders();
  const { jobs, isLoading: isJobsLoading } = useProductionJobs();
  const {
    rawMaterials,
    belowReorderCount,
    isLoading: isRawMaterialsLoading,
  } = useRawMaterials();
  const { totalStockValue, isLoading: isInventoryLoading } = useInventory();

  const [skuCount, setSkuCount] = useState<number | null>(null);
  const [isSkuLoading, setIsSkuLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsSkuLoading(true);

    getProducts({ page: 1, limit: 1 })
      .then((response) => {
        if (isMounted) {
          setSkuCount(response.pagination.total ?? response.data.length);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSkuCount(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSkuLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reorderAlerts = useMemo(
    () => rawMaterials.filter((material) => material.quantity_kg < material.reorder_level),
    [rawMaterials],
  );

  const displayedReorderAlerts = reorderAlerts.slice(0, 3);

  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  const quickActions = useMemo(() => {
    const actions = [] as Array<{
      label: string;
      icon: typeof ClipboardPlus;
      onClick: () => void;
    }>;

    if (canCreateOrders) {
      actions.push({
        label: 'New Order',
        icon: ClipboardPlus,
        onClick: () => navigate('/orders', { state: { openCreate: true } }),
      });
    }
    

    if (canDispatch) {
      actions.push({
        label: 'Pending Dispatch',
        icon: Truck,
        onClick: () => navigate('/orders', { state: { filter: 'pending_dispatch' } }),
      });
    }

    if (canManageProduction) {
      actions.push({
        label: 'New Production Job',
        icon: Package,
        onClick: () => navigate('/production'),
      });
    }

    if (isAdmin) {
      actions.push({
        label: 'User Management',
        icon: Users,
        onClick: () => navigate('/users'),
      });
    }

    if (canDoQC) {
      actions.push({
        label: 'Pending QC',
        icon: CheckCircle,
        onClick: () => navigate('/production', { state: { filter: 'in_progress' } }),
      });
    }

    if (canViewReports) {
      actions.push({
        label: 'View Reports',
        icon: BarChart3,
        onClick: () => navigate('/reports'),
      });
    }

    return actions;
  }, [
    canCreateOrders,
    canDispatch,
    canManageProduction,
    canViewReports,
    canDoQC,
    isAdmin,
    navigate,
  ]);

  const totalSkusLabel = skuCount === null ? '—' : formatNumber(skuCount, 0);
  const totalStockValueLabel = formatNumber(totalStockValue, 0);
  const pendingOrdersLabel = stats ? formatNumber(stats.pendingOrders, 0) : '—';
  const reorderAlertsLabel = isRawMaterialsLoading ? '—' : formatNumber(belowReorderCount);

  const StatCardSkeleton = () => (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-7 w-20 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div className="mt-4 h-4 w-32 animate-pulse rounded bg-gray-100" />
    </article>
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isSkuLoading ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Total SKUs"
            value={totalSkusLabel}
            subtitle="Across all warehouses"
            icon={Package}
            color="amber"
          />
        )}
        {isInventoryLoading ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Stock Value"
            value={totalStockValueLabel}
            subtitle="Quantity sum (placeholder)"
            icon={DollarSign}
            color="blue"
          />
        )}
        {isStatsLoading ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Pending Orders"
            value={pendingOrdersLabel}
            subtitle="Orders awaiting fulfillment"
            icon={ShoppingCart}
            color="green"
          />
        )}
        {isRawMaterialsLoading ? (
          <StatCardSkeleton />
        ) : (
          <StatCard
            title="Reorder Alerts"
            value={reorderAlertsLabel}
            subtitle="Items below reorder level"
            icon={AlertTriangle}
            color="red"
          />
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl bg-white shadow-sm lg:col-span-2">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-800">Recent Production Jobs</h2>
            <button
              type="button"
              className="text-sm font-medium text-amber-600 transition hover:text-amber-700"
              onClick={() => navigate('/production')}
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
                {isJobsLoading ? (
                  skeletonStatuses.map((status, index) => (
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
                  ))
                ) : recentJobs.length === 0 ? (
                  <tr className="border-b border-gray-100 last:border-b-0">
                    <td colSpan={5} className="px-5 py-6">
                      <EmptyState
                        icon={Factory}
                        title="No production jobs yet"
                        description="Recent production activity will appear here."
                        size="sm"
                      />
                    </td>
                  </tr>
                ) : (
                  recentJobs.map((job) => {
                    const materialLabel = job.raw_material?.grade
                      ? `${job.raw_material.material_type} · ${job.raw_material.grade}`
                      : job.raw_material?.material_type ?? '—';

                    return (
                      <tr key={job.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">#{job.id.slice(0, 8)}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">
                          {toTitleCase(job.process_type)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700">{materialLabel}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          {job.started_at ? formatDate(job.started_at) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-xl bg-white p-5 shadow-sm">
            <header className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-semibold text-gray-800">Low Stock Alerts</h2>
            </header>

            <ul className="space-y-3">
              {isRawMaterialsLoading ? (
                <li className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Loading reorder alerts...
                </li>
              ) : reorderAlerts.length === 0 ? (
                <li className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  All raw materials are above reorder level.
                </li>
              ) : (
                displayedReorderAlerts.map((material) => {
                  const title = material.grade
                    ? `${toTitleCase(material.material_type)} · ${material.grade}`
                    : toTitleCase(material.material_type);
                  const unitLabel = material.unit || 'kg';

                  return (
                    <li
                      key={material.id}
                      className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/40 p-3"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{title}</p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(material.quantity_kg)} {unitLabel} | Reorder level {formatNumber(material.reorder_level)} {unitLabel}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>

            {!isRawMaterialsLoading && reorderAlerts.length > displayedReorderAlerts.length ? (
              <p className="mt-3 text-xs font-medium text-gray-500">
                +{formatNumber(reorderAlerts.length - displayedReorderAlerts.length)} more items below reorder level
              </p>
            ) : null}
          </article>

          <article className="rounded-xl bg-white p-5 shadow-sm">
            <header className="mb-4">
              <h2 className="text-base font-semibold text-gray-800">Quick Actions</h2>
            </header>

            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-amber-400 hover:text-amber-700"
                    onClick={action.onClick}
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
