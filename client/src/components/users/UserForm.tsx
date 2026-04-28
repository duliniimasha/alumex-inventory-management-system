import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CreateUserDto, ImsUser, RoleSlug, UpdateUserDto } from '../../types/user.types';
import FormField from '../ui/FormField';
import ToggleSwitch from '../ui/ToggleSwitch';

const ROLE_SLUGS = [
  'system_admin',
  'procurement_officer',
  'production_supervisor',
  'qc_inspector',
  'warehouse_officer',
  'sales_executive',
  'export_coordinator',
  'management_viewer',
] as const;

const ROLE_LABELS: Record<RoleSlug, string> = {
  system_admin: 'System Admin',
  procurement_officer: 'Procurement Officer',
  production_supervisor: 'Production Supervisor',
  qc_inspector: 'QC Inspector',
  warehouse_officer: 'Warehouse Officer',
  sales_executive: 'Sales Executive',
  export_coordinator: 'Export Coordinator',
  management_viewer: 'Management Viewer',
};

const ROLE_DESCRIPTIONS: Record<RoleSlug, string> = {
  system_admin: 'Full system access — all modules and settings',
  procurement_officer: 'Manage suppliers, raw materials, dies, purchase orders',
  production_supervisor: 'Create and manage production jobs, update raw material quantities',
  qc_inspector: 'Record and manage QC inspections, flag inventory holds',
  warehouse_officer: 'Manage stock movements, transfers, stocktake, order dispatch',
  sales_executive: 'Create and manage own orders, customers, raise RMAs',
  export_coordinator: 'Manage export orders, shipping documentation, export inventory',
  management_viewer: 'Read-only access to all modules and reports',
};

const baseSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(ROLE_SLUGS),
  department: z.string().max(80).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

const createUserSchema = baseSchema
  .extend({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

const editUserSchema = baseSchema;

type UserFormValues = z.infer<typeof createUserSchema>;

interface UserFormProps {
  initialData?: ImsUser;
  onSubmit: (dto: CreateUserDto | UpdateUserDto) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
}

function getDefaultValues(initialData?: ImsUser, mode: UserFormProps['mode'] = 'create'): UserFormValues {
  return {
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    password: '',
    confirm_password: '',
    role: initialData?.role ?? 'warehouse_officer',
    department: initialData?.department ?? '',
    is_active: mode === 'create' ? true : initialData?.is_active ?? true,
  };
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

export default function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  mode,
}: UserFormProps) {
  const isEditMode = mode === 'edit';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEditMode ? editUserSchema : createUserSchema),
    defaultValues: getDefaultValues(initialData, mode),
  });

  useEffect(() => {
    reset(getDefaultValues(initialData, mode));
  }, [initialData, mode, reset]);

  const passwordValue = watch('password') ?? '';
  const selectedRole = watch('role');
  const isActive = watch('is_active');

  const passwordScore = useMemo(() => getPasswordScore(passwordValue), [passwordValue]);
  const strength = useMemo(() => getStrengthLabel(passwordScore), [passwordScore]);

  const handleFormSubmit = async (values: UserFormValues) => {
    const trimmedDepartment = values.department?.trim();

    if (isEditMode) {
      const payload: UpdateUserDto = {
        name: values.name.trim(),
        role: values.role,
        department: trimmedDepartment ? trimmedDepartment : undefined,
        is_active: values.is_active,
      };
      await onSubmit(payload);
      return;
    }

    const payload: CreateUserDto = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role,
      department: trimmedDepartment ? trimmedDepartment : undefined,
      is_active: values.is_active,
    };
    await onSubmit(payload);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Full Name" required error={errors.name?.message}>
          <input
            type="text"
            placeholder="e.g. Ayesha Perera"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('name')}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          label="Email"
          required
          error={errors.email?.message}
          hint={isEditMode ? 'Email cannot be changed after account creation' : undefined}
        >
          <input
            type="email"
            placeholder="user@alumex.lk"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50 disabled:bg-gray-50"
            {...register('email')}
            disabled={isSubmitting || isEditMode}
          />
        </FormField>
      </div>

      {!isEditMode ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Password" required error={errors.password?.message}>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white pr-2 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/50">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a secure password"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-gray-900 outline-none"
                {...register('password')}
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
                placeholder="Re-enter password"
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
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Role" required error={errors.role?.message}>
          <select
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('role')}
            disabled={isSubmitting}
          >
            {ROLE_SLUGS.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Department" error={errors.department?.message}>
          <input
            type="text"
            placeholder="e.g. Operations"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            {...register('department')}
            disabled={isSubmitting}
          />
        </FormField>
      </div>

      {selectedRole ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 text-gray-500" />
            <span>{ROLE_DESCRIPTIONS[selectedRole]}</span>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Account Active</p>
            <p className="text-xs text-gray-500">Inactive users cannot log in to the system</p>
          </div>
          <ToggleSwitch
            checked={Boolean(isActive)}
            onChange={(value) => setValue('is_active', value, { shouldDirty: true })}
            disabled={isSubmitting}
          />
        </div>
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
          className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEditMode ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
