import { isAxiosError } from 'axios';
import clsx from 'clsx';
import { ArrowLeft, Globe, Home, Loader2, Plus, ShoppingBag, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { createCustomer, createOrder, getCustomerById } from '../../api/sales.api';
import { getInventoryItems } from '../../api/inventory.api';
import { useClickOutside } from '../../hooks/useClickOutside';
import type {
  CreateCustomerDto,
  CreateOrderDto,
  Customer,
  CustomerType,
  OrderChannel,
  SalesOrder,
  UpdateCustomerDto,
} from '../../types/sales.types';
import { formatNumber } from '../../utils/formatters';
import { formatCurrency } from '../../utils/sales.utils';
import CustomerDetailCard from '../customers/CustomerDetailCard';
import CustomerForm from '../customers/CustomerForm';
import FormField from '../ui/FormField';

interface CustomerOption {
  value: string;
  label: string;
  type: CustomerType;
}

interface ProductOption {
  value: string;
  label: string;
  unit: string;
}

interface OrderLineDraft {
  id: string;
  product_id: string;
  qty_ordered: number;
  unit_price: number;
}

interface CreateOrderFormProps {
  customersForSelect: CustomerOption[];
  productsForSelect: ProductOption[];
  initialCustomerId?: string;
  onCancel: () => void;
  onSuccess: (order: SalesOrder) => void;
  onCustomerCreated?: () => void | Promise<void>;
}

type Step = 1 | 2 | 3;

const channelOptions: Array<{
  value: OrderChannel;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'local',
    label: 'Local',
    description: 'Domestic direct sales orders',
    icon: Home,
  },
  {
    value: 'alumex_store',
    label: 'Alumex Store',
    description: 'Online or retail counter orders',
    icon: ShoppingBag,
  },
  {
    value: 'export',
    label: 'Export',
    description: 'International orders requiring documentation',
    icon: Globe,
  },
];

function createLine(): OrderLineDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    product_id: '',
    qty_ordered: 1,
    unit_price: 0,
  };
}

export default function CreateOrderForm({
  customersForSelect,
  productsForSelect,
  initialCustomerId,
  onCancel,
  onSuccess,
  onCustomerCreated,
}: CreateOrderFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [customerId, setCustomerId] = useState(() => initialCustomerId ?? '');
  const [channel, setChannel] = useState<OrderChannel | ''>('');
  const [lines, setLines] = useState<OrderLineDraft[]>([createLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);
  const customerMenuRef = useRef<HTMLDivElement>(null);
  const lastInitialCustomerId = useRef<string | null>(null);

  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);

  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [stockChecks, setStockChecks] = useState<Record<string, { available: number; isSufficient: boolean }>>({});
  const [isStockChecking, setIsStockChecking] = useState(false);

  useClickOutside(customerMenuRef, () => setIsCustomerMenuOpen(false));

  useEffect(() => {
    if (initialCustomerId && initialCustomerId !== lastInitialCustomerId.current) {
      setCustomerId(initialCustomerId);
      lastInitialCustomerId.current = initialCustomerId;
    }
  }, [initialCustomerId]);

  const selectedCustomerOption = useMemo(
    () => customersForSelect.find((customer) => customer.value === customerId) ?? null,
    [customerId, customersForSelect],
  );

  useEffect(() => {
    if (!customerId) {
      setCustomerDetails(null);
      return;
    }

    let isMounted = true;
    setIsCustomerLoading(true);

    const fetchCustomer = async () => {
      try {
        const response = await getCustomerById(customerId);
        if (isMounted) {
          setCustomerDetails(response);
        }
      } catch {
        if (isMounted) {
          setCustomerDetails(null);
        }
      } finally {
        if (isMounted) {
          setIsCustomerLoading(false);
        }
      }
    };

    void fetchCustomer();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  useEffect(() => {
    if (!selectedCustomerOption) {
      setCustomerSearch('');
      return;
    }

    setCustomerSearch(selectedCustomerOption.label);
  }, [selectedCustomerOption]);

  useEffect(() => {
    if (step !== 3) {
      return;
    }

    let isMounted = true;
    setIsStockChecking(true);

    const checkStock = async () => {
      try {
        const results = await Promise.all(
          lines.map(async (line) => {
            if (!line.product_id || !Number.isFinite(line.qty_ordered)) {
              return { id: line.id, available: 0, isSufficient: false };
            }

            const response = await getInventoryItems({
              product_id: line.product_id,
              page: 1,
              limit: 200,
            });

            const totalQty = response.data.reduce((sum, item) => sum + item.quantity, 0);
            return {
              id: line.id,
              available: totalQty,
              isSufficient: totalQty >= line.qty_ordered,
            };
          }),
        );

        if (!isMounted) {
          return;
        }

        const nextChecks: Record<string, { available: number; isSufficient: boolean }> = {};
        results.forEach((result) => {
          nextChecks[result.id] = {
            available: result.available,
            isSufficient: result.isSufficient,
          };
        });
        setStockChecks(nextChecks);
      } finally {
        if (isMounted) {
          setIsStockChecking(false);
        }
      }
    };

    void checkStock();

    return () => {
      isMounted = false;
    };
  }, [lines, step]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) {
      return customersForSelect;
    }

    return customersForSelect.filter((customer) =>
      customer.label.toLowerCase().includes(query),
    );
  }, [customerSearch, customersForSelect]);

  const totalValue = useMemo(() => {
    return lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0);
  }, [lines]);

  const hasValidLines = lines.length > 0 && lines.every((line) =>
    line.product_id && line.qty_ordered > 0 && line.unit_price > 0,
  );

  const exportEligible = useMemo(() => {
    if (!customerDetails) {
      return false;
    }

    return customerDetails.type === 'export' || customerDetails.country !== 'Sri Lanka';
  }, [customerDetails]);

  const exportError =
    channel === 'export' && customerId && !isCustomerLoading && !exportEligible
      ? 'Select an export customer for export orders'
      : null;

  const isStepOneValid = Boolean(customerId && channel && !exportError);

  const hasStockIssues = useMemo(() => {
    if (step !== 3) {
      return false;
    }

    return lines.some((line) => {
      const check = stockChecks[line.id];
      return !check || !check.isSufficient;
    });
  }, [lines, stockChecks, step]);

  const handleNext = () => {
    if (step === 1) {
      if (!isStepOneValid) {
        setFormError('Select a customer and channel to continue.');
        return;
      }
    }

    if (step === 2) {
      if (!hasValidLines) {
        setFormError('Add at least one valid line item to continue.');
        return;
      }
    }

    setFormError(null);
    setStep((prev) => (prev === 3 ? prev : ((prev + 1) as Step)));
  };

  const handleBack = () => {
    setFormError(null);
    setStep((prev) => (prev === 1 ? prev : ((prev - 1) as Step)));
  };

  const handleLineChange = (lineId: string, updates: Partial<OrderLineDraft>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...updates } : line)),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [...prev, createLine()]);
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const handleCreateCustomer = async (dto: CreateCustomerDto | UpdateCustomerDto) => {
    setIsCreatingCustomer(true);

    try {
      const created = await createCustomer(dto as CreateCustomerDto);

      // Refresh the parent customer list so the new customer is selectable.
      await onCustomerCreated?.();

      // Auto-select the freshly created customer for this order.
      setCustomerId(created.id);
      setCustomerSearch(created.name);
      setIsCustomerMenuOpen(false);
      setIsAddingCustomer(false);
      setFormError(null);
      toast.success(`Customer "${created.name}" created`);
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? error.message
        : error instanceof Error
          ? error.message
          : 'Failed to create customer.';
      toast.error(message);
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasValidLines || !customerId || !channel || hasStockIssues) {
      setFormError('Resolve validation issues before placing the order.');
      return;
    }

    if (channel === 'export' && !exportEligible) {
      setFormError('Select an export customer for export orders.');
      return;
    }

    const payload: CreateOrderDto = {
      customer_id: customerId,
      channel,
      order_lines: lines.map((line) => ({
        product_id: line.product_id,
        qty_ordered: line.qty_ordered,
        unit_price: line.unit_price,
      })),
    };

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await createOrder(payload);
      onSuccess(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create order.';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStepLabel = step === 1 ? 'Customer & Channel' : step === 2 ? 'Order Lines' : 'Review & Confirm';

  if (isAddingCustomer) {
    return (
      <div className="space-y-5">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddingCustomer(false)}
            disabled={isCreatingCustomer}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Back to order"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">New Customer</p>
            <h3 className="text-lg font-semibold text-gray-900">Add a customer for this order</h3>
          </div>
        </header>

        <CustomerForm
          onSubmit={handleCreateCustomer}
          onCancel={() => setIsAddingCustomer(false)}
          isSubmitting={isCreatingCustomer}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-400">Step {step} of 3</p>
          <h3 className="text-lg font-semibold text-gray-900">{currentStepLabel}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className={clsx('rounded-full px-2 py-1', step === 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100')}>
            1
          </span>
          <span className={clsx('rounded-full px-2 py-1', step === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100')}>
            2
          </span>
          <span className={clsx('rounded-full px-2 py-1', step === 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100')}>
            3
          </span>
        </div>
      </header>

      {step === 1 ? (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                <span>Customer</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomerMenuOpen(false);
                  setFormError(null);
                  setIsAddingCustomer(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                <UserPlus className="h-3.5 w-3.5" />
                New Customer
              </button>
            </div>
            <div ref={customerMenuRef} className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCustomerSearch(nextValue);
                  setIsCustomerMenuOpen(true);

                  if (!nextValue) {
                    setCustomerId('');
                  }
                }}
                onFocus={() => setIsCustomerMenuOpen(true)}
                placeholder="Search customers"
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
              />

              {isCustomerMenuOpen ? (
                <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-500">No customers found</p>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.value}
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-amber-50"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setCustomerId(customer.value);
                          setCustomerSearch(customer.label);
                          setIsCustomerMenuOpen(false);
                        }}
                      >
                        {customer.label}
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {isCustomerLoading ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Loading customer details...
            </div>
          ) : customerDetails ? (
            <CustomerDetailCard customer={customerDetails} />
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Order Channel</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {channelOptions.map((option) => {
                const isActive = channel === option.value;
                const Icon = option.icon;
                const isExport = option.value === 'export';
                const isExportInvalid = isExport && exportError;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChannel(option.value)}
                    className={clsx(
                      'rounded-xl border px-4 py-3 text-left transition',
                      isActive ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-200',
                      isExportInvalid ? 'border-red-300 bg-red-50' : null,
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{option.description}</p>
                  </button>
                );
              })}
            </div>
            {exportError ? <p className="text-sm font-medium text-red-600">{exportError}</p> : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          {lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-12">
              <div className="md:col-span-5">
                <FormField label={index === 0 ? 'Product' : `Product ${index + 1}`} required>
                  <select
                    value={line.product_id}
                    onChange={(event) => handleLineChange(line.id, { product_id: event.target.value })}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                  >
                    <option value="">Select product</option>
                    {productsForSelect.map((product) => (
                      <option key={product.value} value={product.value}>
                        {product.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="md:col-span-3">
                <FormField label="Quantity" required>
                  <input
                    type="number"
                    min={1}
                    value={line.qty_ordered}
                    onChange={(event) =>
                      handleLineChange(line.id, { qty_ordered: Number(event.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                  />
                </FormField>
              </div>

              <div className="md:col-span-3">
                <FormField label="Unit Price" required>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unit_price}
                    onChange={(event) =>
                      handleLineChange(line.id, { unit_price: Number(event.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                  />
                </FormField>
              </div>

              <div className="flex items-end justify-end md:col-span-1">
                <button
                  type="button"
                  onClick={() => handleRemoveLine(line.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Add Line
            </button>

            <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
              Running Total: {formatCurrency(totalValue)}
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="grid grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="col-span-6">Product</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Unit</span>
              <span className="col-span-2 text-right">Total</span>
            </div>

            {lines.map((line) => {
              const product = productsForSelect.find((item) => item.value === line.product_id);
              const total = line.qty_ordered * line.unit_price;
              const check = stockChecks[line.id];
              const isSufficient = check?.isSufficient ?? false;

              return (
                <div key={line.id} className="grid grid-cols-12 items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0">
                  <div className="col-span-6">
                    <p className="font-semibold text-gray-900">{product?.label ?? 'Unknown product'}</p>
                    {step === 3 ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {isStockChecking ? 'Checking stock...' : isSufficient ? '✓ In stock' : '✗ Insufficient stock'}
                        {check ? ` (${formatNumber(check.available, 0)} available)` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="col-span-2 text-gray-600">{formatNumber(line.qty_ordered, 0)}</div>
                  <div className="col-span-2 text-gray-600">{formatCurrency(line.unit_price)}</div>
                  <div className="col-span-2 text-right font-semibold text-gray-800">
                    {formatCurrency(total)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Total order value: <span className="font-semibold text-gray-900">{formatCurrency(totalValue)}</span>
            </p>
            <span className="text-xs text-gray-500">Placing this order will reserve the required stock.</span>
          </div>
        </div>
      ) : null}

      {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Back
            </button>
          ) : null}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
              disabled={isSubmitting}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || hasStockIssues || isStockChecking}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Place Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
