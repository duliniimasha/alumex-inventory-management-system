import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import FormField from '../ui/FormField';
import type {
  CreateCustomerDto,
  Customer,
  CustomerType,
  UpdateCustomerDto,
} from '../../types/sales.types';

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  type: z.enum(['b2b', 'fabricator', 'retail', 'export', 'government'], {
    required_error: 'Customer type is required',
  }),
  country: z.string().min(2, 'Country is required'),
  contact_email: z.string().email('Must be a valid email'),
  contact_phone: z
    .string()
    .regex(/^[\+\d\s\-\(\)]{7,20}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  address: z.string().max(300).optional().or(z.literal('')),
}).refine(
  (data) => {
    if (data.type === 'export' && data.country === 'Sri Lanka') {
      return false;
    }
    return true;
  },
  {
    message: 'Export customers must have a country other than Sri Lanka',
    path: ['country'],
  },
);

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Customer;
  onSubmit: (dto: CreateCustomerDto | UpdateCustomerDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
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

const typeLabels: Record<CustomerType, string> = {
  b2b: 'B2B',
  fabricator: 'Fabricator',
  retail: 'Retail',
  export: 'Export',
  government: 'Government',
};

const typeInfo: Record<CustomerType, string> = {
  b2b: 'Direct business customer, standard credit terms apply',
  fabricator: 'Aluminium fabricator, may require technical support',
  retail: 'Individual or small-scale buyer via Alumex Store',
  export: 'International customer, export documentation required',
  government: 'Government entity, may require special procurement process',
};

function getDefaultValues(initialData?: Customer): CustomerFormValues {
  return {
    name: initialData?.name ?? '',
    type: initialData?.type ?? 'b2b',
    country: initialData?.country ?? '',
    contact_email: initialData?.contact_email ?? '',
    contact_phone: initialData?.contact_phone ?? '',
    address: initialData?.address ?? '',
  };
}

function normalizePayload(values: CustomerFormValues): CreateCustomerDto {
  const trimmedPhone = values.contact_phone?.trim();
  const trimmedAddress = values.address?.trim();

  return {
    name: values.name.trim(),
    type: values.type,
    country: values.country,
    contact_email: values.contact_email.trim(),
    contact_phone: trimmedPhone ? trimmedPhone : undefined,
    address: trimmedAddress ? trimmedAddress : undefined,
  };
}

export default function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: getDefaultValues(initialData),
  });

  useEffect(() => {
    reset(getDefaultValues(initialData));
  }, [initialData, reset]);

  const selectedType = watch('type');
  const selectedCountry = watch('country');
  const showExportBanner = selectedType === 'export';
  const exportCountryError =
    showExportBanner && selectedCountry === 'Sri Lanka'
      ? 'Export customers must have a country other than Sri Lanka'
      : undefined;

  const handleFormSubmit = async (values: CustomerFormValues) => {
    const payload = normalizePayload(values);
    await onSubmit(payload);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <FormField label="Customer Name" required error={errors.name?.message}>
        <input
          type="text"
          placeholder="e.g. Alumex Holdings"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('name')}
          disabled={isSubmitting}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Customer Type" required error={errors.type?.message}>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('type')}
            disabled={isSubmitting}
          >
            <option value="">Select type</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Country"
          required
          error={errors.country?.message ?? exportCountryError}
        >
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
      </div>

      {showExportBanner ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4" />
            <span>
              Export customers must be from outside Sri Lanka. Their orders will be processed through the export channel.
            </span>
          </div>
        </div>
      ) : null}

      {selectedType ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 text-gray-500" />
            <span>{typeInfo[selectedType]}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Contact Email" required error={errors.contact_email?.message}>
          <input
            type="email"
            placeholder="customer@example.com"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('contact_email')}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Contact Phone" error={errors.contact_phone?.message}>
          <input
            type="tel"
            placeholder="+94 77 123 4567"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('contact_phone')}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      <FormField label="Address" error={errors.address?.message}>
        <textarea
          rows={3}
          placeholder="Street, City, Postal Code, Country"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
          {...register('address')}
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
          {initialData ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  );
}
