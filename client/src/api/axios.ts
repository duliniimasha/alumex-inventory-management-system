import axios from 'axios';
import { useUiStore } from '../store/ui.store';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    useUiStore.getState().startLoading();

    // Attach the current Supabase access token (auto-refreshed by the client).
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    useUiStore.getState().stopLoading();
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    useUiStore.getState().stopLoading();
    return response;
  },
  async (error) => {
    useUiStore.getState().stopLoading();

    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;