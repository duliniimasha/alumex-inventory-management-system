import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import type { Customer, OrderChannel, OrderStatus, SalesOrder } from '../../types/sales.types';
import { formatDate, toTitleCase } from '../../utils/formatters';

interface CustomerDetailCardProps {
  customer: Customer;
  onEdit?: () => void;
  showOrderHistory?: boolean;
}

type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple';

const countryFlagByName: Record<string, string> = {
  'sri lanka': '🇱🇰',
  india: '🇮🇳',
  china: '🇨🇳',
  germany: '🇩🇪',
  usa: '🇺🇸',
  'united states': '🇺🇸',
  'united states of america': '🇺🇸',
  australia: '🇦🇺',
  uae: '🇦🇪',
  'united arab emirates': '🇦🇪',
  malaysia: '🇲🇾',
  singapore: '🇸🇬',
  japan: '🇯🇵',
  uk: '🇬🇧',
  'united kingdom': '🇬🇧',
};

const typeColorByValue: Record<Customer['type'], BadgeColor> = {
  b2b: 'blue',
  fabricator: 'purple',
  retail: 'amber',
  export: 'green',
  government: 'gray',
};

const statusConfig: Record<OrderStatus, { label: string; color: BadgeColor }> = {
  pending: { label: 'Pending', color: 'amber' },
  confirmed: { label: 'Confirmed', color: 'blue' },
  picking: { label: 'Picking', color: 'purple' },
  dispatched: { label: 'Dispatched', color: 'green' },
  delivered: { label: 'Delivered', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
  returned: { label: 'Returned', color: 'gray' },
};

const channelConfig: Record<OrderChannel, { label: string; color: BadgeColor }> = {
  local: { label: 'Local', color: 'gray' },
  alumex_store: { label: 'Alumex Store', color: 'blue' },
  export: { label: 'Export', color: 'purple' },
};

function getCountryFlag(country?: string | null): string {
  if (!country) {
    return '🌍';
  }

  const normalized = country.trim().toLowerCase();
  return countryFlagByName[normalized] ?? '🌍';
}

function getOrderIdentifier(orderId: string): string {
  return `#ORD-${orderId.slice(0, 8).toUpperCase()}`;
}

function getRecentOrders(customer: Customer): SalesOrder[] {
  const extendedCustomer = customer as Customer & { recent_orders?: SalesOrder[] };
  const orders = extendedCustomer.recent_orders ?? [];

  return [...orders]
    .sort((left, right) => new Date(right.order_date).getTime() - new Date(left.order_date).getTime())
    .slice(0, 3);
}

export default function CustomerDetailCard({
  customer,
  onEdit,
  showOrderHistory = false,
}: CustomerDetailCardProps) {
  const recentOrders = getRecentOrders(customer);
  const totalOrders = customer._count?.sales_orders ?? 0;
  const typeLabel = toTitleCase(customer.type);
  const typeColor = typeColorByValue[customer.type] ?? 'gray';
  const flagEmoji = getCountryFlag(customer.country);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
            <Badge label={typeLabel} color={typeColor} />
            <span className="text-lg" aria-hidden="true">{flagEmoji}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{customer.country || '—'}</p>
        </div>

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Edit
          </button>
        ) : null}
      </header>

      <div className="mt-5 grid grid-cols-1 gap-4 text-sm text-gray-600 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">Email</p>
          <p className="mt-1 text-sm text-gray-800">{customer.contact_email || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">Phone</p>
          <p className="mt-1 text-sm text-gray-800">{customer.contact_phone || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">Address</p>
          <p className="mt-1 text-sm text-gray-800">{customer.address || '—'}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <span className="font-semibold text-gray-800">Total Orders:</span> {totalOrders}
      </div>

      {showOrderHistory ? (
        <section className="mt-6">
          <header className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Recent Orders</h3>
            </div>
            <Link
              to="/orders"
              state={{ customer_id: customer.id }}
              className="text-sm font-medium text-amber-600 transition hover:text-amber-700"
            >
              View all orders
            </Link>
          </header>

          {recentOrders.length === 0 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              No recent orders for this customer.
            </div>
          ) : (
            <ul className="space-y-2">
              {recentOrders.map((order) => {
                const status = statusConfig[order.status];
                const channel = channelConfig[order.channel];

                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-700"
                  >
                    <div className="min-w-[160px] font-semibold text-gray-800">
                      {getOrderIdentifier(order.id)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={status.label} color={status.color} />
                      <Badge label={channel.label} color={channel.color} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.order_date ? formatDate(order.order_date) : '—'}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </article>
  );
}
