import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  variant?: 'inline' | 'page';
}

export default function ErrorAlert({
  message,
  onRetry,
  variant = 'inline',
}: ErrorAlertProps) {
  if (variant === 'page') {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <div className="mb-3 rounded-full bg-white p-3 text-red-500 shadow-sm">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold text-red-700">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="inline-flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      ) : null}
    </div>
  );
}
