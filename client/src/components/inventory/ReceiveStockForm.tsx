import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import type { ReceiveStockDto, WarehouseZone } from '../../types/inventory.types';
import FormField from '../ui/FormField';

const receiveStockSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  job_id: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: 'Must be a number' })
    .positive('Quantity must be greater than 0')
    .max(999999),
  location_code: z
    .string()
    .min(1, 'Location code is required')
    .max(20)
    .regex(/^[A-Z0-9\-]+$/, 'Location code must be uppercase letters, numbers, or hyphens')
    .transform((val) => val.toUpperCase()),
  warehouse_zone: z.enum(['main', 'export', 'quarantine', 'dispatch', 'returns'], {
    required_error: 'Warehouse zone is required',
  }),
});

type ReceiveStockFormValues = z.infer<typeof receiveStockSchema>;

interface ProductSelectOption {
  value: string;
  label: string;
  category: string;
  finish_type?: string;
  unit?: string;
  name?: string;
  sku?: string;
}

interface JobSelectOption {
  value: string;
  label: string;
}

interface ReceiveStockFormProps {
  onSubmit: (dto: ReceiveStockDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  productsForSelect: ProductSelectOption[];
  productionJobsForSelect: JobSelectOption[];
}

type MenuState = {
  isOpen: boolean;
  search: string;
};

const zoneOptions: Array<{ value: WarehouseZone; label: string }> = [
  { value: 'main', label: 'Main' },
  { value: 'export', label: 'Export' },
  { value: 'quarantine', label: 'Quarantine' },
  { value: 'dispatch', label: 'Dispatch' },
  { value: 'returns', label: 'Returns' },
];

function canWriteExport(role: string) {
  return role === 'export_coordinator' || role === 'system_admin';
}

function parseProductLabel(label: string): { sku: string; name: string } {
  const [sku, name] = label.split(' — ');
  if (name) {
    return { sku, name };
  }

  return { sku: label, name: label };
}

export default function ReceiveStockForm({
  onSubmit,
  onCancel,
  isSubmitting,
  productsForSelect,
  productionJobsForSelect,
}: ReceiveStockFormProps) {
  const { currentRole } = useRoleAccess();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReceiveStockFormValues>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: {
      product_id: '',
      job_id: '',
      quantity: undefined,
      location_code: '',
      warehouse_zone: undefined,
    },
  });

  const selectedProductId = watch('product_id');
  const selectedJobId = watch('job_id');
  const selectedZone = watch('warehouse_zone');
  const quantity = watch('quantity');
  const locationCode = watch('location_code');

  const [productMenu, setProductMenu] = useState<MenuState>({
    isOpen: false,
    search: '',
  });
  const [jobMenu, setJobMenu] = useState<MenuState>({
    isOpen: false,
    search: '',
  });

  const productMenuRef = useRef<HTMLDivElement>(null);
  const jobMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(productMenuRef, () => setProductMenu((state) => ({ ...state, isOpen: false })));
  useClickOutside(jobMenuRef, () => setJobMenu((state) => ({ ...state, isOpen: false })));

  useEffect(() => {
    if (!selectedProductId) {
      setProductMenu((state) => ({ ...state, search: '' }));
      return;
    }

    const selectedOption = productsForSelect.find(
      (option) => option.value === selectedProductId,
    );

    if (selectedOption) {
      setProductMenu((state) => ({ ...state, search: selectedOption.label }));
    }
  }, [productsForSelect, selectedProductId]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobMenu((state) => ({ ...state, search: '' }));
      return;
    }

    const selectedOption = productionJobsForSelect.find(
      (option) => option.value === selectedJobId,
    );

    if (selectedOption) {
      setJobMenu((state) => ({ ...state, search: selectedOption.label }));
    }
  }, [productionJobsForSelect, selectedJobId]);

  const filteredProducts = useMemo(() => {
    const query = productMenu.search.trim().toLowerCase();

    if (!query) {
      return productsForSelect;
    }

    return productsForSelect.filter((product) =>
      product.label.toLowerCase().includes(query),
    );
  }, [productMenu.search, productsForSelect]);

  const filteredJobs = useMemo(() => {
    const query = jobMenu.search.trim().toLowerCase();

    if (!query) {
      return productionJobsForSelect;
    }

    return productionJobsForSelect.filter((job) =>
      job.label.toLowerCase().includes(query),
    );
  }, [jobMenu.search, productionJobsForSelect]);

  const selectedProduct = useMemo(
    () => productsForSelect.find((option) => option.value === selectedProductId),
    [productsForSelect, selectedProductId],
  );

  const productInfo = selectedProduct
    ? {
        ...parseProductLabel(selectedProduct.label),
        category: selectedProduct.category,
        finish: selectedProduct.finish_type ?? '—',
        unit: selectedProduct.unit ?? 'units',
        name: selectedProduct.name ?? parseProductLabel(selectedProduct.label).name,
      }
    : null;

  const exportRestricted = selectedZone === 'export' && !canWriteExport(currentRole);
  const disableSubmit = isSubmitting || exportRestricted;

  const locationRegister = register('location_code');

  const handleFormSubmit = async (values: ReceiveStockFormValues) => {
    const payload: ReceiveStockDto = {
      product_id: values.product_id,
      job_id: values.job_id?.trim() ? values.job_id : undefined,
      quantity: values.quantity,
      location_code: values.location_code.toUpperCase(),
      warehouse_zone: values.warehouse_zone,
    };

    await onSubmit(payload);
  };

  const summaryProduct = productInfo?.name ?? '—';
  const summaryQuantity = Number.isFinite(quantity) ? quantity : '—';
  const summaryUnit = productInfo?.unit ?? 'units';
  const summaryLocation = locationCode ? locationCode.toUpperCase() : '—';
  const summaryZone = selectedZone
    ? selectedZone.charAt(0).toUpperCase() + selectedZone.slice(1)
    : '—';

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <FormField label="Product" required error={errors.product_id?.message}>
        <div ref={productMenuRef} className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={productMenu.search}
              onChange={(event) => {
                const nextValue = event.target.value;
                setProductMenu({ isOpen: true, search: nextValue });

                if (selectedProductId) {
                  setValue('product_id', '', { shouldValidate: true });
                }
              }}
              onFocus={() => setProductMenu((state) => ({ ...state, isOpen: true }))}
              placeholder="Search and select product"
              className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
              disabled={isSubmitting}
            />
          </div>

          <input type="hidden" {...register('product_id')} />

          {productMenu.isOpen ? (
            <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">No products found</p>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.value}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-amber-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setValue('product_id', product.value, { shouldValidate: true });
                      setProductMenu({ isOpen: false, search: product.label });
                    }}
                  >
                    {product.label}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </FormField>

      {productInfo ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
              SKU {productInfo.sku}
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {productInfo.category}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-600">Finish type: {productInfo.finish}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Quantity" required error={errors.quantity?.message}>
          <div className="relative">
            <input
              type="number"
              step="any"
              placeholder="0"
              className="h-11 w-full rounded-lg border border-gray-300 pr-16 pl-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
              {...register('quantity', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
              {productInfo?.unit ?? 'units'}
            </span>
          </div>
        </FormField>

        <FormField label="Warehouse Zone" required error={errors.warehouse_zone?.message}>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('warehouse_zone')}
            disabled={isSubmitting}
            defaultValue=""
          >
            <option value="" disabled>
              Select zone
            </option>
            {zoneOptions.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
          {exportRestricted ? (
            <p className="text-xs font-medium text-red-600">
              You do not have permission to receive into the export zone
            </p>
          ) : null}
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="Location Code"
          required
          error={errors.location_code?.message}
          hint="Use format: ZONE-AISLE-SHELF-BIN"
        >
          <input
            type="text"
            placeholder="e.g. A-01-03 (Aisle-Shelf-Bin)"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 uppercase outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...locationRegister}
            onChange={(event) => {
              const nextValue = event.target.value.toUpperCase();
              event.target.value = nextValue;
              locationRegister.onChange(event);
            }}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          label="Production Job"
          hint="Link to the production job that created this stock"
          error={errors.job_id?.message}
        >
          <div ref={jobMenuRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={jobMenu.search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setJobMenu({ isOpen: true, search: nextValue });

                  if (selectedJobId) {
                    setValue('job_id', '', { shouldValidate: true });
                  }
                }}
                onFocus={() => setJobMenu((state) => ({ ...state, isOpen: true }))}
                placeholder="Search and select production job"
                className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                disabled={isSubmitting}
              />
            </div>

            <input type="hidden" {...register('job_id')} />

            {jobMenu.isOpen ? (
              <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {filteredJobs.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">No jobs found</p>
                ) : (
                  filteredJobs.map((job) => (
                    <button
                      key={job.value}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-amber-50"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setValue('job_id', job.value, { shouldValidate: true });
                        setJobMenu({ isOpen: false, search: job.label });
                      }}
                    >
                      {job.label}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </FormField>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900">Receiving Summary</h4>
        <div className="mt-3 space-y-1 text-sm text-gray-700">
          <p>
            <span className="font-medium text-gray-500">Product:</span> {summaryProduct}
          </p>
          <p>
            <span className="font-medium text-gray-500">Quantity:</span> {summaryQuantity} {summaryUnit}
          </p>
          <p>
            <span className="font-medium text-gray-500">Location:</span> {summaryLocation}
          </p>
          <p>
            <span className="font-medium text-gray-500">Zone:</span> {summaryZone}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={disableSubmit}
          className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Receive Stock
        </button>
      </div>
    </form>
  );
}
