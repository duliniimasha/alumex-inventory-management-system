import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  createInspection,
  getInspectionsByJobId,
  updateInspection,
} from '../api/production.api';
import type {
  CreateQcInspectionDto,
  QcInspection,
  QcResult,
  UpdateQcInspectionDto,
} from '../types/production.types';

interface ResultCounts {
  pass: number;
  hold: number;
  reject: number;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export function useQcInspections(jobId: string) {
  const [inspections, setInspections] = useState<QcInspection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = useCallback(async () => {
    if (!jobId) {
      setInspections([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getInspectionsByJobId(jobId);
      setInspections(response);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, 'Failed to fetch QC inspections.'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void fetchInspections();
  }, [fetchInspections]);

  const submitInspection = useCallback(
    async (dto: CreateQcInspectionDto) => {
      if (!jobId) {
        toast.error('Select a production job before submitting an inspection.');
        return false;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await createInspection(jobId, dto);
        await fetchInspections();
        toast.success('QC inspection recorded successfully.');
        return true;
      } catch (submitError) {
        const message = getErrorMessage(submitError, 'Failed to submit QC inspection.');
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchInspections, jobId],
  );

  const editInspection = useCallback(
    async (id: string, dto: UpdateQcInspectionDto) => {
      setIsSubmitting(true);
      setError(null);

      try {
        await updateInspection(id, dto);
        await fetchInspections();
        toast.success('QC inspection updated successfully.');
        return true;
      } catch (editError) {
        const message = getErrorMessage(editError, 'Failed to update QC inspection.');
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchInspections],
  );

  const latestResult = useMemo<QcResult | null>(
    () => inspections[0]?.result ?? null,
    [inspections],
  );

  const hasPassingInspection = useMemo(
    () => inspections.some((inspection) => inspection.result === 'pass'),
    [inspections],
  );

  const resultCounts = useMemo<ResultCounts>(
    () =>
      inspections.reduce(
        (counts, inspection) => {
          counts[inspection.result] += 1;
          return counts;
        },
        { pass: 0, hold: 0, reject: 0 },
      ),
    [inspections],
  );

  return {
    inspections,
    isLoading,
    isSubmitting,
    error,
    latestResult,
    hasPassingInspection,
    resultCounts,
    fetchInspections,
    submitInspection,
    editInspection,
  };
}
