import api from './axios';
import { supabase } from '../lib/supabase';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUserProfile {
  user_id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

interface CurrentUserResponse {
  success: boolean;
  message: string;
  data: AuthUserProfile;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Signs in via Supabase Auth (which establishes & persists the session), then
 * loads the application profile (role/department) from the backend.
 */
export async function loginUser(payload: LoginPayload): Promise<AuthUserProfile> {
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw error;
  }

  return getCurrentUser();
}

export async function logoutUser(): Promise<void> {
  // Best-effort server-side session revocation; always clear the local session.
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore — signing out locally is what matters for the user.
  }

  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<AuthUserProfile> {
  const response = await api.get<CurrentUserResponse>('/auth/me');
  return response.data.data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<{ success: boolean }> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: { success: boolean };
  }>('/auth/change-password', payload);

  return response.data.data;
}
