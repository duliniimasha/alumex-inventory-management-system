import axios from 'axios';
import { useUiStore } from '../store/ui.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    useUiStore.getState().startLoading();
    const token = localStorage.getItem('alumex_token');

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
  (error) => {
    useUiStore.getState().stopLoading();

    if (error.response?.status === 401) {
      localStorage.removeItem('alumex_token');
      localStorage.removeItem('alumex_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;