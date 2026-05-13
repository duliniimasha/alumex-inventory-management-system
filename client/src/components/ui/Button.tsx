import clsx from 'clsx';
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export default function Button({
  children,
  className,
  disabled,
  variant = 'primary',
  isLoading = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
        {
          'bg-emerald-700 text-white hover:bg-emerald-800': variant === 'primary',
          'bg-slate-200 text-slate-800 hover:bg-slate-300': variant === 'secondary',
          'cursor-not-allowed opacity-70': disabled || isLoading,
        },
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Please wait...' : children}
    </button>
  );
}