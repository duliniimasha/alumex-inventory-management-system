import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import type { InventoryItem, TransferStockDto, WarehouseZone } from '../../types/inventory.types';
import FormField from '../ui/FormField';

const transferSchema = z.object({
  location_code: z
    .string()
    .min(1, 'New location code is required')
    .max(20)
    .regex(/^[A-Z0-9\-]+$/, 'Must be uppercase letters, numbers, hyphens')
    .transform((val) => val.toUpperCase()),
  warehouse_zone: z.enum(['main', 'export', 'quarantine', 'dispatch', 'returns']),
  reason: z.string().max(200).optional(),
});

type TransferStockFormValues = z.infer<typeof transferSchema>;

interface TransferStockFormProps {
  item: InventoryItem;
  onSubmit: (dto: TransferStockDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

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

export default function TransferStockForm({
  item,
  onSubmit,
  onCancel,
  isSubmitting,
}: TransferStockFormProps) {
  const { currentRole } = useRoleAccess();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransferStockFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      location_code: '',
      warehouse_zone: undefined,
      reason: '',
    },
  });

  const selectedZone = watch('warehouse_zone');
  const locationCode = watch('location_code');

  const exportRestricted = selectedZone === 'export' && !canWriteExport(currentRole);

  const isSameLocation = useMemo(() => {
    if (!selectedZone || !locationCode) {
      return false;
    }

    return (
      selectedZone === item.warehouse_zone &&
      locationCode.toUpperCase() === item.location_code.toUpperCase()
    );
  }, [item.location_code, item.warehouse_zone, locationCode, selectedZone]);

  const disableSubmit = isSubmitting || exportRestricted || isSameLocation;

  const locationRegister = register('location_code');

  const handleFormSubmit = async (values: TransferStockFormValues) => {
    const payload: TransferStockDto = {
      location_code: values.location_code.toUpperCase(),
      warehouse_zone: values.warehouse_zone,
      reason: values.reason?.trim() ? values.reason.trim() : undefined,
    };

    await onSubmit(payload);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
        <span>Moving from:</span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800">
          {item.warehouse_zone} / {item.location_code}
        </span>
        <ArrowRight className="h-4 w-4 text-gray-400" />
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800">
          New location
        </span>
      </div>

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

      <FormField label="New Location Code" required error={errors.location_code?.message}>
        <input
          type="text"
          placeholder="e.g. A-01-03"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 uppercase outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...locationRegister}
          onChange={(event) => {
            const nextValue = event.target.value.toUpperCase();
            event.target.value = nextValue;
            locationRegister.onChange(event);
          }}
          disabled={isSubmitting}
        />
        {isSameLocation ? (
          <p className="text-xs font-medium text-red-600">
            New location must be different from the current location
          </p>
        ) : null}
      </FormField>

      <FormField label="Reason" error={errors.reason?.message}>
        <textarea
          rows={2}
          placeholder="Reason for transfer (optional)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('reason')}
          disabled={isSubmitting}
        />
      </FormField>

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
          Transfer Stock
        </button>
      </div>
    </form>
  );
}
