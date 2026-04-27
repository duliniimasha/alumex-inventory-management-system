import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useClickOutside } from '../../hooks/useClickOutside';
import type {
  CreateRawMaterialDto,
  RawMaterial,
  UpdateRawMaterialDto,
} from '../../types/rawMaterial.types';
import FormField from '../ui/FormField';

const rawMaterialSchema = z.object({
  material_type: z.enum(['billet', 'chemical', 'die', 'traded_good', 'other'], {
    required_error: 'Material type is required',
  }),
  grade: z.string().max(80).optional().or(z.literal('')),
  quantity_kg: z.number({ invalid_type_error: 'Must be a number' })
    .positive('Must be greater than 0')
    .max(999999),
  unit: z.enum(['kg', 'litre', 'piece', 'metre', 'set']),
  reorder_level: z.number({ invalid_type_error: 'Must be a number' })
    .nonnegative('Must be 0 or more'),
  supplier_id: z.string().min(1, 'Supplier is required'),
});

type RawMaterialFormValues = z.infer<typeof rawMaterialSchema>;

interface SupplierSelectOption {
  value: string;
  label: string;
}

interface RawMaterialFormProps {
  initialData?: RawMaterial;
  onSubmit: (data: CreateRawMaterialDto | UpdateRawMaterialDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  suppliersForSelect: SupplierSelectOption[];
}

function getDefaultValues(initialData?: RawMaterial): Partial<RawMaterialFormValues> {
  if (!initialData) {
    return {
      material_type: undefined,
      grade: '',
      quantity_kg: undefined,
      unit: undefined,
      reorder_level: undefined,
      supplier_id: '',
    };
  }

  return {
    material_type: initialData.material_type,
    grade: initialData.grade ?? '',
    quantity_kg: initialData.quantity_kg,
    unit: initialData.unit as RawMaterialFormValues['unit'],
    reorder_level: initialData.reorder_level,
    supplier_id: initialData.supplier_id,
  };
}

function normalizePayload(values: RawMaterialFormValues): CreateRawMaterialDto {
  const trimmedGrade = values.grade?.trim();

  return {
    material_type: values.material_type,
    grade: trimmedGrade ? trimmedGrade : undefined,
    quantity_kg: values.quantity_kg,
    unit: values.unit,
    reorder_level: values.reorder_level,
    supplier_id: values.supplier_id,
  };
}

export default function RawMaterialForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  suppliersForSelect,
}: RawMaterialFormProps) {
  const isEditMode = Boolean(initialData);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RawMaterialFormValues>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: getDefaultValues(initialData),
  });

  const selectedSupplierId = watch('supplier_id');
  const quantityKg = watch('quantity_kg');
  const reorderLevel = watch('reorder_level');

  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(false);
  const supplierMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(supplierMenuRef, () => setIsSupplierMenuOpen(false));

  useEffect(() => {
    reset(getDefaultValues(initialData));
  }, [initialData, reset]);

  useEffect(() => {
    if (!selectedSupplierId) {
      return;
    }

    const selectedOption = suppliersForSelect.find(
      (supplier) => supplier.value === selectedSupplierId,
    );

    if (selectedOption) {
      setSupplierSearch(selectedOption.label);
    }
  }, [selectedSupplierId, suppliersForSelect]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();

    if (!query) {
      return suppliersForSelect;
    }

    return suppliersForSelect.filter((supplier) =>
      supplier.label.toLowerCase().includes(query),
    );
  }, [supplierSearch, suppliersForSelect]);

  const showBelowReorderWarning =
    Number.isFinite(quantityKg) &&
    Number.isFinite(reorderLevel) &&
    Number(quantityKg) < Number(reorderLevel);

  const onFormSubmit = async (values: RawMaterialFormValues) => {
    const payload = normalizePayload(values);
    await onSubmit(payload);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      {showBelowReorderWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          ⚠ Current quantity is below the reorder level
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Material Type" required error={errors.material_type?.message}>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('material_type')}
            disabled={isSubmitting}
            defaultValue={initialData?.material_type ?? ''}
          >
            <option value="" disabled>
              Select material type
            </option>
            <option value="billet">Billet</option>
            <option value="chemical">Chemical</option>
            <option value="die">Die</option>
            <option value="traded_good">Traded Good</option>
            <option value="other">Other</option>
          </select>
        </FormField>

        <FormField
          label="Grade"
          error={errors.grade?.message}
          hint="Alloy grade or specification code"
        >
          <input
            type="text"
            placeholder="e.g. AA6063, T5"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('grade')}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          label="Quantity"
          required
          error={errors.quantity_kg?.message}
          hint="Current stock quantity"
        >
          <input
            type="number"
            step="any"
            placeholder="0.00"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('quantity_kg', { valueAsNumber: true })}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Unit" required error={errors.unit?.message}>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('unit')}
            disabled={isSubmitting}
            defaultValue={initialData?.unit ?? ''}
          >
            <option value="" disabled>
              Select unit
            </option>
            <option value="kg">kg</option>
            <option value="litre">litre</option>
            <option value="piece">piece</option>
            <option value="metre">metre</option>
            <option value="set">set</option>
          </select>
        </FormField>

        <FormField
          label="Reorder Level"
          required
          error={errors.reorder_level?.message}
          hint="System will alert when stock falls below this level"
        >
          <input
            type="number"
            step="any"
            placeholder="0.00"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('reorder_level', { valueAsNumber: true })}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Supplier" required error={errors.supplier_id?.message}>
          <div ref={supplierMenuRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSupplierSearch(nextValue);
                  setIsSupplierMenuOpen(true);

                  if (selectedSupplierId) {
                    setValue('supplier_id', '', { shouldValidate: true });
                  }
                }}
                onFocus={() => setIsSupplierMenuOpen(true)}
                placeholder="Search and select supplier"
                className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                disabled={isSubmitting}
              />
            </div>

            <input type="hidden" {...register('supplier_id')} />

            {isSupplierMenuOpen ? (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {filteredSuppliers.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500">No suppliers found</p>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <button
                      key={supplier.value}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-amber-50"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setValue('supplier_id', supplier.value, { shouldValidate: true });
                        setSupplierSearch(supplier.label);
                        setIsSupplierMenuOpen(false);
                      }}
                    >
                      {supplier.label}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </FormField>
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
          disabled={isSubmitting}
          className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditMode ? 'Update Raw Material' : 'Create Raw Material'}
        </button>
      </div>
    </form>
  );
}