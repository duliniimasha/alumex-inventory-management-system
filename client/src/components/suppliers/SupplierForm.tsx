import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import FormField from '../ui/FormField';
import type {
  CreateSupplierDto,
  Supplier,
  UpdateSupplierDto,
} from '../../types/supplier.types';

const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  country: z.string().min(2, 'Country is required'),
  contact_email: z.string().email('Must be a valid email address'),
  certification: z.string().max(100).optional().or(z.literal('')),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  initialData?: Supplier;
  onSuccess: (supplier: Supplier) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  onSubmit: (data: CreateSupplierDto | UpdateSupplierDto) => Promise<void>;
}

const countryOptions = [
  'Sri Lanka',
  'India',
  'China',
  'Germany',
  'USA',
  'Australia',
  'UAE',
  'Malaysia',
  'Singapore',
  'Japan',
  'Other',
] as const;

function getDefaultValues(initialData?: Supplier): SupplierFormValues {
  return {
    name: initialData?.name ?? '',
    country: initialData?.country ?? '',
    contact_email: initialData?.contact_email ?? '',
    certification: initialData?.certification ?? '',
  };
}

function normalizePayload(values: SupplierFormValues): CreateSupplierDto {
  const trimmedCertification = values.certification?.trim();

  return {
    name: values.name.trim(),
    country: values.country,
    contact_email: values.contact_email.trim(),
    certification: trimmedCertification ? trimmedCertification : undefined,
  };
}

export default function SupplierForm({
  initialData,
  onSuccess,
  onCancel,
  isSubmitting,
  onSubmit,
}: SupplierFormProps) {
  const isEditMode = Boolean(initialData);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: getDefaultValues(initialData),
  });

  useEffect(() => {
    reset(getDefaultValues(initialData));
  }, [initialData, reset]);

  const handleFormSubmit = async (values: SupplierFormValues) => {
    const payload = normalizePayload(values);

    await onSubmit(payload);

    const now = new Date().toISOString();
    const supplierForCallback: Supplier = {
      id: initialData?.id ?? `temp-${Date.now()}`,
      created_at: initialData?.created_at ?? now,
      updated_at: now,
      deleted_at: initialData?.deleted_at ?? null,
      name: payload.name,
      country: payload.country,
      contact_email: payload.contact_email,
      certification: payload.certification ?? null,
    };

    onSuccess(supplierForCallback);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <FormField label="Supplier Name" required error={errors.name?.message}>
        <input
          type="text"
          placeholder="e.g. Hindalco Industries Ltd"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('name')}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField label="Country" required error={errors.country?.message}>
        <select
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('country')}
          disabled={isSubmitting}
        >
          <option value="">Select country</option>
          {countryOptions.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Contact Email" required error={errors.contact_email?.message}>
        <input
          type="email"
          placeholder="supplier@example.com"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('contact_email')}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField
        label="Certification"
        hint="Enter any quality certifications held by this supplier"
        error={errors.certification?.message}
      >
        <input
          type="text"
          placeholder="e.g. ISO 9001, QUALICOAT"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('certification')}
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
          disabled={isSubmitting}
          className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditMode ? 'Update Supplier' : 'Create Supplier'}
        </button>
      </div>
    </form>
  );
}