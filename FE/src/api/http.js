import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const http = axios.create({
  baseURL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('chainstore_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('chainstore_token');
    }
    const body = err?.response?.data;
    if (body?.message) {
      const apiErr = new Error(body.message);
      apiErr.status = err.response?.status ?? body.statusCode;
      apiErr.errors = body?.errors ?? body?.data;
      return Promise.reject(apiErr);
    }
    return Promise.reject(err);
  },
);
