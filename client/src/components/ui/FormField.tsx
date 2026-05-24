import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export default function FormField({ label, error, required = false, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
        <span>{label}</span>
        {required ? <span className="text-red-500">*</span> : null}
      </label>

      {children}

      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}