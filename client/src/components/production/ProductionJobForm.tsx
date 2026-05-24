import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useClickOutside } from '../../hooks/useClickOutside';
import type {
  CreateProductionJobDto,
  ProcessType,
  ProductionJob,
  UpdateProductionJobDto,
} from '../../types/production.types';
import FormField from '../ui/FormField';

interface RawMaterialSelectOption {
  value: string;
  label: string;
  material_type?: string;
  grade?: string | null;
  quantity_kg?: number;
  reorder_level?: number;
}

interface DieSelectOption {
  value: string;
  label: string;
  condition?: string;
}

interface ProductionJobFormProps {
  initialData?: ProductionJob;
  onSubmit: (data: CreateProductionJobDto | UpdateProductionJobDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  rawMaterialsForSelect: RawMaterialSelectOption[];
  diesForSelect: DieSelectOption[];
}

const processTypeOptions: { value: ProcessType; label: string }[] = [
  { value: 'extrusion', label: 'Extrusion' },
  { value: 'powder_coating', label: 'Powder Coating' },
  { value: 'anodizing', label: 'Anodizing' },
  { value: 'die_casting', label: 'Die Casting' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'welding', label: 'Welding' },
  { value: 'laser', label: 'Laser' },
  { value: 'cnc', label: 'CNC' },
  { value: 'other', label: 'Other' },
];

const parseNumberInput = (value: unknown) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number(value);
};

const productionJobSchema = z
  .object({
    material_id: z.string().min(1, 'Raw material is required'),
    die_id: z.string().optional().or(z.literal('')),
    process_type: z.enum(
      [
        'extrusion',
        'powder_coating',
        'anodizing',
        'die_casting',
        'cutting',
        'welding',
        'laser',
        'cnc',
        'other',
      ],
      { message: 'Process type is required' },
    ),
    input_qty_kg: z
      .number({ message: 'Must be a number' })
      .positive('Input quantity must be greater than 0'),
    output_qty_kg: z
      .number({ message: 'Must be a number' })
      .positive('Output quantity must be greater than 0')
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (
      (values.process_type === 'extrusion' || values.process_type === 'die_casting') &&
      !values.die_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['die_id'],
        message: 'Die is required for this process type',
      });
    }
  });

type ProductionJobFormValues = z.infer<typeof productionJobSchema>;

type MenuState = {
  isOpen: boolean;
  search: string;
};

function getDefaultValues(initialData?: ProductionJob): Partial<ProductionJobFormValues> {
  return {
    material_id: initialData?.material_id ?? '',
    die_id: initialData?.die_id ?? '',
    process_type: initialData?.process_type ?? undefined,
    input_qty_kg: initialData?.input_qty_kg ?? undefined,
    output_qty_kg: initialData?.output_qty_kg ?? undefined,
  };
}

function buildRawMaterialLabel(option: RawMaterialSelectOption): string {
  if (option.grade || option.material_type) {
    const grade = option.grade ? option.grade.trim() : '';
    const type = option.material_type ? option.material_type.trim() : '';
    const combined = [grade, type].filter(Boolean).join(' - ');
    return combined || option.label;
  }

  return option.label;
}

function getConditionTone(condition: string | undefined): string {
  const normalized = condition?.toLowerCase() ?? '';

  if (normalized.includes('retired') || normalized.includes('damaged')) {
    return 'bg-red-100 text-red-700';
  }

  if (normalized.includes('service') || normalized.includes('wear')) {
    return 'bg-amber-100 text-amber-700';
  }

  if (!normalized) {
    return 'bg-slate-100 text-slate-600';
  }

  return 'bg-emerald-100 text-emerald-700';
}

function getYieldTone(percentage: number): string {
  if (percentage >= 85) {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (percentage >= 70) {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-red-100 text-red-700';
}

export default function ProductionJobForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  rawMaterialsForSelect,
  diesForSelect,
}: ProductionJobFormProps) {
  const isEditMode = Boolean(initialData);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductionJobFormValues>({
    resolver: zodResolver(productionJobSchema),
    defaultValues: getDefaultValues(initialData),
  });

  const selectedMaterialId = watch('material_id');
  const selectedDieId = watch('die_id');
  const processType = watch('process_type');
  const inputQty = watch('input_qty_kg');
  const outputQty = watch('output_qty_kg');

  const [materialMenu, setMaterialMenu] = useState<MenuState>({
    isOpen: false,
    search: '',
  });
  const [dieMenu, setDieMenu] = useState<MenuState>({ isOpen: false, search: '' });

  const materialMenuRef = useRef<HTMLDivElement>(null);
  const dieMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(materialMenuRef, () =>
    setMaterialMenu((state) => ({ ...state, isOpen: false })),
  );
  useClickOutside(dieMenuRef, () => setDieMenu((state) => ({ ...state, isOpen: false })));

  useEffect(() => {
    reset(getDefaultValues(initialData));
  }, [initialData, reset]);

  useEffect(() => {
    if (!selectedMaterialId) {
      setMaterialMenu((state) => ({ ...state, search: '' }));
      return;
    }

    const selectedOption = rawMaterialsForSelect.find(
      (material) => material.value === selectedMaterialId,
    );

    if (selectedOption) {
      setMaterialMenu((state) => ({ ...state, search: buildRawMaterialLabel(selectedOption) }));
    }
  }, [rawMaterialsForSelect, selectedMaterialId]);

  useEffect(() => {
    if (!selectedDieId) {
      setDieMenu((state) => ({ ...state, search: '' }));
      return;
    }

    const selectedOption = diesForSelect.find((die) => die.value === selectedDieId);

    if (selectedOption) {
      setDieMenu((state) => ({ ...state, search: selectedOption.label }));
    }
  }, [diesForSelect, selectedDieId]);

  const filteredMaterials = useMemo(() => {
    const query = materialMenu.search.trim().toLowerCase();

    if (!query) {
      return rawMaterialsForSelect;
    }

    return rawMaterialsForSelect.filter((material) =>
      buildRawMaterialLabel(material).toLowerCase().includes(query),
    );
  }, [materialMenu.search, rawMaterialsForSelect]);

  const filteredDies = useMemo(() => {
    const query = dieMenu.search.trim().toLowerCase();

    if (!query) {
      return diesForSelect;
    }

    return diesForSelect.filter((die) => die.label.toLowerCase().includes(query));
  }, [dieMenu.search, diesForSelect]);

  const selectedMaterial = useMemo(
    () => rawMaterialsForSelect.find((material) => material.value === selectedMaterialId),
    [rawMaterialsForSelect, selectedMaterialId],
  );

  const selectedDie = useMemo(
    () => diesForSelect.find((die) => die.value === selectedDieId),
    [diesForSelect, selectedDieId],
  );

  const availableQty = selectedMaterial?.quantity_kg;
  const reorderLevel = selectedMaterial?.reorder_level;
  const belowReorder =
    Number.isFinite(availableQty) &&
    Number.isFinite(reorderLevel) &&
    Number(availableQty) < Number(reorderLevel);

  const exceedsAvailable =
    Number.isFinite(inputQty) && Number.isFinite(availableQty)
      ? Number(inputQty) > Number(availableQty)
      : false;

  const showOutputQty =
    isEditMode &&
    (initialData?.status === 'in_progress' ||
      initialData?.status === 'on_hold' ||
      initialData?.status === 'completed');

  const yieldPercent =
    Number.isFinite(inputQty) && Number.isFinite(outputQty) && Number(inputQty) > 0
      ? (Number(outputQty) / Number(inputQty)) * 100
      : null;

  const isDieRequired = processType === 'extrusion' || processType === 'die_casting';

  const onFormSubmit = async (values: ProductionJobFormValues) => {
    if (isEditMode) {
      const payload: UpdateProductionJobDto = {
        output_qty_kg: values.output_qty_kg,
      };
      await onSubmit(payload);
      return;
    }

    const payload: CreateProductionJobDto = {
      material_id: values.material_id,
      die_id: values.die_id ? values.die_id : undefined,
      process_type: values.process_type,
      input_qty_kg: values.input_qty_kg,
      output_qty_kg: values.output_qty_kg,
    };

    await onSubmit(payload);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onFormSubmit)} noValidate>
      <input type="hidden" {...register('material_id')} />
      <input type="hidden" {...register('die_id')} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Process Type" required error={errors.process_type?.message}>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('process_type')}
            disabled={isSubmitting}
            defaultValue={initialData?.process_type ?? ''}
          >
            <option value="" disabled>
              Select process type
            </option>
            {processTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Raw Material" required error={errors.material_id?.message}>
          <div ref={materialMenuRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={materialMenu.search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setMaterialMenu({ isOpen: true, search: nextValue });

                  if (selectedMaterialId) {
                    setValue('material_id', '', { shouldValidate: true });
                  }
                }}
                onFocus={() => setMaterialMenu((state) => ({ ...state, isOpen: true }))}
                placeholder="Search and select raw material"
                className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                disabled={isSubmitting}
              />
            </div>

            {materialMenu.isOpen ? (
              <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {filteredMaterials.length ? (
                  filteredMaterials.map((material) => (
                    <button
                      key={material.value}
                      type="button"
                      onClick={() => {
                        setValue('material_id', material.value, { shouldValidate: true });
                        setMaterialMenu({ isOpen: false, search: buildRawMaterialLabel(material) });
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-amber-50"
                    >
                      <span>{buildRawMaterialLabel(material)}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No materials found</div>
                )}
              </div>
            ) : null}
          </div>

          {selectedMaterial && Number.isFinite(availableQty) ? (
            <div
              className={
                belowReorder
                  ? 'mt-2 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700'
                  : 'mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700'
              }
            >
              Available: {Number(availableQty).toFixed(2)} kg
            </div>
          ) : null}
        </FormField>

        <FormField
          label="Die"
          required={isDieRequired}
          error={errors.die_id?.message}
          hint="Required for extrusion and die casting"
        >
          <div ref={dieMenuRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={dieMenu.search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setDieMenu({ isOpen: true, search: nextValue });

                  if (selectedDieId) {
                    setValue('die_id', '', { shouldValidate: true });
                  }
                }}
                onFocus={() => setDieMenu((state) => ({ ...state, isOpen: true }))}
                placeholder="Search and select die"
                className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                disabled={isSubmitting}
              />
            </div>

            {dieMenu.isOpen ? (
              <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {filteredDies.length ? (
                  filteredDies.map((die) => (
                    <button
                      key={die.value}
                      type="button"
                      onClick={() => {
                        setValue('die_id', die.value, { shouldValidate: true });
                        setDieMenu({ isOpen: false, search: die.label });
                      }}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-amber-50"
                    >
                      <span>{die.label}</span>
                      {die.condition ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getConditionTone(
                            die.condition,
                          )}`}
                        >
                          {die.condition}
                        </span>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">No dies found</div>
                )}
              </div>
            ) : null}
          </div>

          {selectedDie?.condition ? (
            <div
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getConditionTone(
                selectedDie.condition,
              )}`}
            >
              {selectedDie.condition}
            </div>
          ) : null}
        </FormField>

        <FormField label="Input Quantity (kg)" required error={errors.input_qty_kg?.message}>
          <input
            type="number"
            step="any"
            placeholder="0.00"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('input_qty_kg', { setValueAs: parseNumberInput })}
            disabled={isSubmitting}
          />
          {exceedsAvailable && Number.isFinite(availableQty) ? (
            <p className="mt-1 text-xs font-medium text-red-600">
              Exceeds available stock ({Number(availableQty).toFixed(2)} kg)
            </p>
          ) : null}
        </FormField>

        {showOutputQty ? (
          <FormField
            label="Output Quantity (kg)"
            error={errors.output_qty_kg?.message}
            hint="Actual output after processing losses"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                {...register('output_qty_kg', { setValueAs: parseNumberInput })}
                disabled={isSubmitting}
              />
              {yieldPercent !== null ? (
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getYieldTone(
                    yieldPercent,
                  )}`}
                >
                  Yield: {yieldPercent.toFixed(1)}%
                </span>
              ) : null}
            </div>
          </FormField>
        ) : null}
      </div>

      {!isEditMode ? (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Creating this job will deduct {Number.isFinite(inputQty) ? inputQty : 0} kg from the
          selected raw material stock.
        </div>
      ) : null}

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
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditMode ? 'Update Job' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}
