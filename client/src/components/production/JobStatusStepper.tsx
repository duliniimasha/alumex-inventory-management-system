import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Check,
  CheckCircle2,
  Clock,
  Cog,
  Loader2,
  PauseCircle,
  Play,
  XCircle,
} from 'lucide-react';
import Badge from '../ui/Badge';
import type { JobStatus } from '../../types/production.types';

interface JobStatusStepperProps {
  currentStatus: JobStatus;
  onStatusChange: (newStatus: JobStatus) => void;
  isUpdating: boolean;
  canUpdate: boolean;
  hasPassingInspection: boolean;
}

type StepKey = 'pending' | 'in_progress' | 'completed';

type StepConfig = {
  key: StepKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainSteps: StepConfig[] = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'in_progress', label: 'In Progress', icon: Cog },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const labelTone: Record<JobStatus, string> = {
  pending: 'text-slate-500',
  in_progress: 'text-blue-600',
  completed: 'text-emerald-600',
  on_hold: 'text-red-600',
  cancelled: 'text-slate-400',
};

const badgeTone: Record<JobStatus, 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple'> = {
  pending: 'amber',
  in_progress: 'blue',
  completed: 'green',
  on_hold: 'red',
  cancelled: 'gray',
};

const labelText: Record<JobStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

const hintText = 'A passing QC inspection is required before completing this job';

function StepNode({
  label,
  icon: Icon,
  isComplete,
  isCurrent,
  isFuture,
  isHold,
  isCancelled,
  number,
  toneClassName,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  isHold?: boolean;
  isCancelled?: boolean;
  number: number;
  toneClassName?: string;
}) {
  const showCheck = isComplete;
  const isCompletedCurrent = isCurrent && !isHold && label === 'Completed';

  const circleClasses = clsx(
    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors',
    {
      'bg-amber-500 text-white': showCheck,
      'bg-amber-400 text-white ring-2 ring-amber-400 ring-offset-2': isCurrent && !isCompletedCurrent,
      'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2': isCompletedCurrent,
      'bg-red-500 text-white ring-2 ring-red-300 ring-offset-2': isHold,
      'bg-slate-200 text-slate-500': isFuture,
    },
  );

  const labelClasses = clsx('text-xs font-semibold', toneClassName, {
    'line-through text-slate-400': isCancelled,
  });

  return (
    <div className="flex min-w-[110px] flex-col items-center gap-2">
      <div className={circleClasses} aria-hidden="true">
        {showCheck ? (
          <Check className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <span className={labelClasses}>{label}</span>
      <span className="sr-only">Step {number}</span>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  tone,
  disabled,
  isLoading,
  hint,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  tone: 'blue' | 'green' | 'amber';
  disabled: boolean;
  isLoading: boolean;
  hint?: string;
}) {
  const classes = clsx(
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
    {
      'bg-blue-600 text-white hover:bg-blue-700': tone === 'blue',
      'bg-emerald-600 text-white hover:bg-emerald-700': tone === 'green',
      'bg-amber-500 text-white hover:bg-amber-600': tone === 'amber',
      'cursor-not-allowed opacity-60': disabled || isLoading,
    },
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled || isLoading}
        title={disabled && hint ? hint : undefined}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {label}
      </button>
      {disabled && hint ? (
        <span className="text-xs text-amber-700">{hint}</span>
      ) : null}
    </div>
  );
}

export default function JobStatusStepper({
  currentStatus,
  onStatusChange,
  isUpdating,
  canUpdate,
  hasPassingInspection,
}: JobStatusStepperProps) {
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null);
  const isOnHold = currentStatus === 'on_hold';
  const isCancelled = currentStatus === 'cancelled';

  useEffect(() => {
    if (!isUpdating) {
      setPendingStatus(null);
    }
  }, [isUpdating]);

  const currentIndex = useMemo(() => {
    if (isCancelled) {
      return -1;
    }

    if (isOnHold) {
      return mainSteps.findIndex((step) => step.key === 'in_progress');
    }

    return mainSteps.findIndex((step) => step.key === currentStatus);
  }, [currentStatus, isCancelled, isOnHold]);

  const statusCounts = useMemo(() => {
    const completedThrough = isOnHold ? currentIndex : currentIndex - 1;

    return mainSteps.map((_, index) => {
      if (currentIndex === -1) {
        return { isComplete: false, isCurrent: false, isFuture: true };
      }

      const isComplete = index <= completedThrough;
      const isCurrent = index === currentIndex && !isOnHold;
      const isFuture = !isComplete && !isCurrent;

      return { isComplete, isCurrent, isFuture };
    });
  }, [currentIndex, isOnHold]);

  const handleStatusChange = useCallback(
    (nextStatus: JobStatus) => {
      if (isUpdating) {
        return;
      }

      setPendingStatus(nextStatus);
      onStatusChange(nextStatus);
    },
    [isUpdating, onStatusChange],
  );

  const showActions = canUpdate && currentStatus !== 'completed' && currentStatus !== 'cancelled';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-start">
            <StepNode
              label="Pending"
              icon={Clock}
              number={1}
              toneClassName={labelTone.pending}
              isComplete={statusCounts[0].isComplete}
              isCurrent={statusCounts[0].isCurrent}
              isFuture={statusCounts[0].isFuture}
            />
            <div
              className={clsx('mt-5 h-0.5 flex-1', {
                'bg-amber-400': statusCounts[0].isComplete || statusCounts[0].isCurrent,
                'bg-slate-200': statusCounts[0].isFuture,
              })}
            />
            <div className="relative flex flex-col items-center">
              <StepNode
                label="In Progress"
                icon={Cog}
                number={2}
                toneClassName={labelTone.in_progress}
                isComplete={statusCounts[1].isComplete}
                isCurrent={statusCounts[1].isCurrent}
                isFuture={statusCounts[1].isFuture}
              />
              <div
                className={clsx('absolute top-[52px] h-8 w-0.5', {
                  'bg-red-300': isOnHold,
                  'bg-slate-200': !isOnHold,
                })}
              />
              <div className="mt-8">
                <StepNode
                  label="On Hold"
                  icon={PauseCircle}
                  number={4}
                  toneClassName={labelTone.on_hold}
                  isComplete={false}
                  isCurrent={false}
                  isFuture={!isOnHold}
                  isHold={isOnHold}
                />
              </div>
            </div>
            <div
              className={clsx('mt-5 h-0.5 flex-1', {
                'bg-amber-400': statusCounts[1].isComplete || statusCounts[1].isCurrent,
                'bg-slate-200': statusCounts[1].isFuture,
              })}
            />
            <StepNode
              label="Completed"
              icon={CheckCircle2}
              number={3}
              toneClassName={labelTone.completed}
              isComplete={statusCounts[2].isComplete}
              isCurrent={statusCounts[2].isCurrent}
              isFuture={statusCounts[2].isFuture}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {isCancelled ? (
              <div className="flex items-center gap-2 text-slate-400">
                <XCircle className="h-4 w-4" />
                <span className="line-through">Cancelled</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          {showActions ? (
            <div className="flex flex-wrap items-center gap-3">
              {currentStatus === 'pending' ? (
                <ActionButton
                  label="Start Job"
                  icon={Play}
                  tone="blue"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={!canUpdate || isUpdating}
                  isLoading={isUpdating && pendingStatus === 'in_progress'}
                />
              ) : null}

              {currentStatus === 'in_progress' ? (
                <>
                  <ActionButton
                    label="Mark Complete"
                    icon={CheckCircle2}
                    tone="green"
                    onClick={() => handleStatusChange('completed')}
                    disabled={!hasPassingInspection || isUpdating}
                    isLoading={isUpdating && pendingStatus === 'completed'}
                    hint={!hasPassingInspection ? hintText : undefined}
                  />
                  <ActionButton
                    label="Put On Hold"
                    icon={PauseCircle}
                    tone="amber"
                    onClick={() => handleStatusChange('on_hold')}
                    disabled={isUpdating}
                    isLoading={isUpdating && pendingStatus === 'on_hold'}
                  />
                </>
              ) : null}

              {currentStatus === 'on_hold' ? (
                <ActionButton
                  label="Resume Job"
                  icon={Play}
                  tone="blue"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdating}
                  isLoading={isUpdating && pendingStatus === 'in_progress'}
                />
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Badge label={`Status: ${labelText[currentStatus]}`} color={badgeTone[currentStatus]} />
              {!canUpdate ? (
                <span className="text-xs text-slate-500">Read-only access</span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
