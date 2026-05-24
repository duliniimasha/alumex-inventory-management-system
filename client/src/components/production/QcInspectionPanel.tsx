import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import {
  Check,
  ClipboardCheck,
  ClipboardX,
  Loader2,
  Pencil,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useQcInspections } from '../../hooks/useQcInspections';
import type {
  CreateQcInspectionDto,
  JobStatus,
  QcInspection,
  QcResult,
  UpdateQcInspectionDto,
} from '../../types/production.types';
import { formatDateTime } from '../../utils/formatters';
import Badge from '../ui/Badge';
import FormField from '../ui/FormField';

interface QcInspectionPanelProps {
  jobId: string;
  jobStatus: JobStatus;
  canInspect: boolean;
}

const resultOptions: Array<{ value: QcResult; label: string }> = [
  { value: 'pass', label: 'Pass' },
  { value: 'hold', label: 'Hold' },
  { value: 'reject', label: 'Reject' },
];

const qcInspectionSchema = z.object({
  result: z.enum(['pass', 'hold', 'reject'], { required_error: 'Result is required' }),
  inspector_name: z.string().min(2, 'Inspector name must be at least 2 characters'),
  notes: z.string().optional(),
});

type QcInspectionFormValues = z.infer<typeof qcInspectionSchema>;

const resultBadgeTone: Record<QcResult, 'green' | 'amber' | 'red'> = {
  pass: 'green',
  hold: 'amber',
  reject: 'red',
};

const resultBorderTone: Record<QcResult, string> = {
  pass: 'border-emerald-400',
  hold: 'border-amber-400',
  reject: 'border-red-400',
};

const latestTone: Record<QcResult, string> = {
  pass: 'bg-emerald-100 text-emerald-700',
  hold: 'bg-amber-100 text-amber-700',
  reject: 'bg-red-100 text-red-700',
};

const resultLabel: Record<QcResult, string> = {
  pass: 'Pass',
  hold: 'Hold',
  reject: 'Reject',
};

function getResultButtonClass(value: QcResult, isActive: boolean, disabled: boolean) {
  return clsx(
    'rounded-full border px-3 py-1 text-xs font-semibold transition',
    {
      'border-emerald-500 bg-emerald-500 text-white': isActive && value === 'pass',
      'border-amber-500 bg-amber-500 text-white': isActive && value === 'hold',
      'border-red-500 bg-red-500 text-white': isActive && value === 'reject',
      'border-slate-200 text-slate-600 hover:border-slate-300': !isActive,
      'cursor-not-allowed opacity-60': disabled,
    },
  );
}

function getLatestBadge(result: QcResult | null) {
  if (!result) {
    return {
      label: 'Latest: -',
      tone: 'bg-slate-100 text-slate-600',
    };
  }

  return {
    label: `Latest: ${result.toUpperCase()}`,
    tone: latestTone[result],
  };
}

function getDefaultValues(): QcInspectionFormValues {
  return {
    result: undefined,
    inspector_name: '',
    notes: '',
  } as QcInspectionFormValues;
}

export default function QcInspectionPanel({ jobId, jobStatus, canInspect }: QcInspectionPanelProps) {
  const {
    inspections,
    isLoading,
    isSubmitting,
    latestResult,
    hasPassingInspection,
    resultCounts,
    submitInspection,
    editInspection,
  } = useQcInspections(jobId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ result: QcResult; notes: string }>({
    result: 'pass',
    notes: '',
  });
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [isCreatePending, setIsCreatePending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<QcInspectionFormValues>({
    resolver: zodResolver(qcInspectionSchema),
    defaultValues: getDefaultValues(),
  });

  const selectedResult = watch('result');

  useEffect(() => {
    reset(getDefaultValues());
    setEditingId(null);
  }, [jobId, reset]);

  useEffect(() => {
    if (!isSubmitting) {
      setPendingEditId(null);
      setIsCreatePending(false);
    }
  }, [isSubmitting]);

  const showAddForm =
    canInspect && (jobStatus === 'in_progress' || jobStatus === 'on_hold');

  const latestBadge = useMemo(() => getLatestBadge(latestResult), [latestResult]);

  const allRejected = useMemo(() => {
    if (!inspections.length) {
      return false;
    }

    return resultCounts.reject === inspections.length;
  }, [inspections.length, resultCounts.reject]);

  const handleAddInspection = async (values: QcInspectionFormValues) => {
    const payload: CreateQcInspectionDto = {
      result: values.result,
      inspector_name: values.inspector_name.trim(),
      notes: values.notes?.trim() || undefined,
    };

    setIsCreatePending(true);

    const success = await submitInspection(payload);

    if (success) {
      reset(getDefaultValues());

      if (payload.result === 'reject') {
        toast('⚠ Rejection recorded - this job will be placed on hold automatically');
      }
    }
  };

  const handleEditInspection = async (inspectionId: string) => {
    const payload: UpdateQcInspectionDto = {
      result: editValues.result,
      notes: editValues.notes.trim() ? editValues.notes.trim() : undefined,
    };

    setPendingEditId(inspectionId);

    const success = await editInspection(inspectionId, payload);

    if (success) {
      setEditingId(null);
    }
  };

  const openEditForm = (inspection: QcInspection) => {
    setEditingId(inspection.id);
    setEditValues({
      result: inspection.result,
      notes: inspection.notes ?? '',
    });
  };

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Pass: {resultCounts.pass}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <PauseCircle className="h-3.5 w-3.5" />
              Hold: {resultCounts.hold}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              <XCircle className="h-3.5 w-3.5" />
              Reject: {resultCounts.reject}
            </span>
          </div>

          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${latestBadge.tone}`}>
            {latestBadge.label}
          </span>
        </div>

        {hasPassingInspection ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <Check className="h-4 w-4" />
            This job has a passing inspection - eligible for completion
          </div>
        ) : null}

        {allRejected ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            <XCircle className="h-4 w-4" />
            All inspections rejected - job has been placed on hold
          </div>
        ) : null}
      </div>

      {showAddForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit(handleAddInspection)} noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Result <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {resultOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('result', option.value, { shouldValidate: true })}
                    className={getResultButtonClass(
                      option.value,
                      selectedResult === option.value,
                      isSubmitting,
                    )}
                    disabled={isSubmitting}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {errors.result?.message ? (
                <p className="text-xs font-medium text-red-600">{errors.result.message}</p>
              ) : null}
            </div>

            <FormField
              label="Inspector Name"
              required
              error={errors.inspector_name?.message}
            >
              <input
                type="text"
                placeholder="Inspector full name"
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                {...register('inspector_name')}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Notes" error={errors.notes?.message}>
              <textarea
                rows={3}
                placeholder="Describe findings, measurements, defects..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                {...register('notes')}
                disabled={isSubmitting}
              />
            </FormField>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreatePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
                Record Inspection
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800">Inspection History</h3>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`qc-skeleton-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
              </div>
            ))
          ) : inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-gray-500">
              <ClipboardX className="h-6 w-6" />
              <p className="text-sm">No inspections recorded yet</p>
            </div>
          ) : (
            inspections.map((inspection) => {
              const isEditing = editingId === inspection.id;
              const isEditPending = pendingEditId === inspection.id && isSubmitting;

              return (
                <div
                  key={inspection.id}
                  className={`rounded-lg border-l-4 bg-gray-50 px-4 py-3 ${resultBorderTone[inspection.result]}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={resultLabel[inspection.result]} color={resultBadgeTone[inspection.result]} />
                      <span className="text-sm font-semibold text-gray-800">
                        {inspection.inspector_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(inspection.inspected_at)}
                      </span>
                    </div>

                    {canInspect ? (
                      <button
                        type="button"
                        onClick={() => openEditForm(inspection)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 transition hover:text-gray-900"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {resultOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setEditValues((state) => ({ ...state, result: option.value }))
                            }
                            className={getResultButtonClass(
                              option.value,
                              editValues.result === option.value,
                              isSubmitting,
                            )}
                            disabled={isSubmitting}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={3}
                        value={editValues.notes}
                        onChange={(event) =>
                          setEditValues((state) => ({ ...state, notes: event.target.value }))
                        }
                        placeholder="Update notes"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                        disabled={isSubmitting}
                      />

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={isSubmitting}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditInspection(inspection.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isEditPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={clsx('mt-2 text-sm text-gray-500', {
                        italic: inspection.notes,
                      })}
                    >
                      {inspection.notes || 'No notes provided.'}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
