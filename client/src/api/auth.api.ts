import api from './axios';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      user_id: string;
      name: string;
      email: string;
      role: string;
      department: string | null;
      is_active: boolean;
      created_at: string;
    };
  };
}

interface CurrentUserResponse {
  success: boolean;
  message: string;
  data: LoginResponse['data']['user'];
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getCurrentUser(): Promise<LoginResponse['data']['user']> {
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
