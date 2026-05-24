import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ResetPasswordDto } from '../../types/user.types';
import FormField from '../ui/FormField';

const resetPasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  userId: string;
  userName: string;
  onSubmit: (dto: ResetPasswordDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function getPasswordScore(value: string): number {
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  return score;
}

function getStrengthLabel(score: number): { label: string; tone: string } {
  if (score >= 4) {
    return { label: 'Strong', tone: 'text-emerald-600' };
  }
  if (score >= 3) {
    return { label: 'Good', tone: 'text-emerald-500' };
  }
  if (score >= 2) {
    return { label: 'Fair', tone: 'text-amber-600' };
  }
  return { label: 'Weak', tone: 'text-red-600' };
}

export default function ResetPasswordForm({
  userName,
  onSubmit,
  onCancel,
  isSubmitting,
}: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  });

  const passwordValue = watch('new_password') ?? '';
  const passwordScore = useMemo(() => getPasswordScore(passwordValue), [passwordValue]);
  const strength = useMemo(() => getStrengthLabel(passwordScore), [passwordScore]);

  const handleFormSubmit = async (values: ResetPasswordValues) => {
    await onSubmit({
      new_password: values.new_password,
      confirm_password: values.confirm_password,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">Reset password for {userName}</h3>
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>The user will need to use their new password on next login.</span>
        </div>
      </header>

      <FormField label="New Password" required error={errors.new_password?.message}>
        <div className="flex items-center rounded-lg border border-gray-300 bg-white pr-2 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/50">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter a new password"
            className="h-11 w-full border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
            {...register('new_password')}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, index) => {
              const isFilled = index < passwordScore;
              const tone =
                passwordScore <= 1
                  ? 'bg-red-500'
                  : passwordScore === 2
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

              return (
                <span
                  key={`strength-${index}`}
                  className={`h-1.5 flex-1 rounded-full ${isFilled ? tone : 'bg-gray-200'}`}
                />
              );
            })}
          </div>
          <p className={`text-xs font-semibold ${strength.tone}`}>Strength: {strength.label}</p>
        </div>
      </FormField>

      <FormField label="Confirm Password" required error={errors.confirm_password?.message}>
        <div className="flex items-center rounded-lg border border-gray-300 bg-white pr-2 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/50">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter new password"
            className="h-11 w-full border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
            {...register('confirm_password')}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            onClick={() => setShowConfirm((value) => !value)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
          className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Reset Password
        </button>
      </div>
    </form>
  );
}
