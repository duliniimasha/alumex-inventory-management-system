import type { ImsUser } from '../../types/user.types';
import { formatDate, formatNumber } from '../../utils/formatters';
import Badge from '../ui/Badge';

interface UserActivityCardProps {
  user: ImsUser;
}

function getAccountAge(createdAt: string): number | null {
  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays < 0 ? 0 : diffDays;
}

export default function UserActivityCard({ user }: UserActivityCardProps) {
  const stockMovements = user._count?.stock_movements ?? 0;
  const auditLogs = user._count?.audit_logs ?? 0;
  const accountAge = user.created_at ? getAccountAge(user.created_at) : null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">User Activity</h3>
          <p className="text-sm text-gray-500">Quick account usage overview</p>
        </div>
        <Badge label={user.is_active ? 'Active' : 'Inactive'} color={user.is_active ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Stock Movements</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatNumber(stockMovements)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Audit Actions</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatNumber(auditLogs)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Account Age</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {accountAge !== null ? `${accountAge} days` : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">Created {formatDate(user.created_at)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Last Role Change</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">N/A</p>
          <p className="mt-1 text-xs text-gray-500">Coming soon</p>
        </div>
      </div>
    </article>
  );
}
