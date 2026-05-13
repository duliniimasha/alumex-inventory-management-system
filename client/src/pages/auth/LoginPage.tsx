import { useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Mail, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginUser } from '../../api/auth.api';
import AuthLayout from '../../layouts/AuthLayout';
import { useAuthStore } from '../../store/auth.store';
import type { LoginFormData } from '../../types/auth.types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormData) => {
    setApiError(null);

    try {
      const response = await loginUser(values);
      const { token, user } = response.data;

      setAuth(token, user);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      let message = 'Unable to sign in right now.';

      if (axios.isAxiosError(error)) {
        const apiMessage = error.response?.data?.message;
        message = Array.isArray(apiMessage)
          ? apiMessage.join(', ')
          : apiMessage ?? message;
      }

      setApiError(message);
      toast.error(message);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-7 shadow-lg sm:p-9">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold tracking-[0.14em] text-slate-700">ALUMEX IMS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-600">Enter your credentials to access the IMS</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-slate-700">
              Email
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/50">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="your.email@alumex.lk"
                className="h-11 w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white pr-2 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/50">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-11 w-full border-0 bg-transparent px-3 text-sm text-slate-900 outline-none"
                {...register('password')}
              />
              <button
                type="button"
                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>

          {apiError && <p className="text-sm text-red-600">{apiError}</p>}

          <p className="text-center text-xs text-slate-500">
            Access is restricted to authorised Alumex personnel only.
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}