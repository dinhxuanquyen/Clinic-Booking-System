import axios from 'axios';
import { getToken, logout as clearAuth } from '../utils/auth.js';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        const returnUrl = `${window.location.pathname}${window.location.search}`;
        window.history.pushState(null, '', `/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }

    throw new ApiError(payload?.message || error.message || 'Request failed', status, payload);
  }
);

export async function api(path, options = {}) {
  const response = await axiosClient.request({
    url: path,
    method: options.method || 'GET',
    data: options.body ? JSON.parse(options.body) : options.data,
    params: options.params,
    headers: options.headers
  });

  return response.data;
}

export async function apiForm(path, formData) {
  const response = await axiosClient.request({
    url: path,
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
