import clsx from 'clsx';
import {
  LayoutGrid,
  Lock,
  RotateCcw,
  Ship,
  ShieldAlert,
  Truck,
  Warehouse,
} from 'lucide-react';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import type { WarehouseZone } from '../../types/inventory.types';

interface WarehouseZoneMapProps {
  zoneSummary: Record<WarehouseZone, { count: number; totalQty: number }>;
  activeZone: WarehouseZone | '';
  onZoneClick: (zone: WarehouseZone | '') => void;
}

type ZoneCardConfig = {
  key: WarehouseZone;
  label: string;
  icon: typeof Warehouse;
  borderClass: string;
  iconClass: string;
};

const ZONE_CARDS: ZoneCardConfig[] = [
  {
    key: 'main',
    label: 'Main',
    icon: Warehouse,
    borderClass: 'border-l-blue-500',
    iconClass: 'text-blue-600',
  },
  {
    key: 'export',
    label: 'Export',
    icon: Ship,
    borderClass: 'border-l-purple-500',
    iconClass: 'text-purple-600',
  },
  {
    key: 'quarantine',
    label: 'Quarantine',
    icon: ShieldAlert,
    borderClass: 'border-l-red-500',
    iconClass: 'text-red-600',
  },
  {
    key: 'dispatch',
    label: 'Dispatch',
    icon: Truck,
    borderClass: 'border-l-green-500',
    iconClass: 'text-green-600',
  },
  {
    key: 'returns',
    label: 'Returns',
    icon: RotateCcw,
    borderClass: 'border-l-amber-500',
    iconClass: 'text-amber-600',
  },
];

function canWriteExport(role: string) {
  return role === 'export_coordinator' || role === 'system_admin';
}

export default function WarehouseZoneMap({
  zoneSummary,
  activeZone,
  onZoneClick,
}: WarehouseZoneMapProps) {
  const { currentRole } = useRoleAccess();
  const exportRestricted = !canWriteExport(currentRole);

  const totals = Object.values(zoneSummary).reduce(
    (accumulator, entry) => {
      accumulator.count += entry.count;
      accumulator.totalQty += entry.totalQty;
      return accumulator;
    },
    { count: 0, totalQty: 0 },
  );

  const handleZoneClick = (zone: WarehouseZone | '') => {
    if (activeZone === zone) {
      onZoneClick('');
      return;
    }

    onZoneClick(zone);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        onClick={() => handleZoneClick('')}
        className={clsx(
          'group relative flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition',
          'border-l-4 border-l-gray-400 hover:shadow-sm',
          activeZone === '' && 'border-amber-300 border-l-amber-400 bg-amber-50',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">All Zones</h3>
          </div>
        </div>
        <p className="text-sm text-gray-500">{totals.count} items</p>
        <p className="text-sm font-semibold text-gray-700">{totals.totalQty} units</p>
      </button>

      {ZONE_CARDS.map((zone) => {
        const summary = zoneSummary[zone.key] ?? { count: 0, totalQty: 0 };
        const isActive = activeZone === zone.key;
        const isQuarantine = zone.key === 'quarantine';
        const showReviewBadge = isQuarantine && summary.count > 0;
        const isExport = zone.key === 'export';
        const Icon = zone.icon;

        return (
          <button
            key={zone.key}
            type="button"
            onClick={() => handleZoneClick(zone.key)}
            className={clsx(
              'group relative flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition',
              'border-l-4 hover:shadow-sm',
              zone.borderClass,
              isActive && 'border-amber-300 border-l-amber-400 bg-amber-50',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className={clsx('h-5 w-5', zone.iconClass)} />
                <h3 className="text-sm font-semibold text-gray-900">{zone.label}</h3>
              </div>
              {showReviewBadge ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Needs review
                </span>
              ) : null}
            </div>

            <p className="text-sm text-gray-500">{summary.count} items</p>
            <p className="text-sm font-semibold text-gray-700">{summary.totalQty} units</p>

            {isExport && exportRestricted ? (
              <div className="pointer-events-none absolute right-3 top-3 flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="absolute right-0 top-9 w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Write access restricted to Export Coordinators
                </div>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
