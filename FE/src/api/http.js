import axios from 'axios';

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
const baseURL = configuredBaseURL
  || (import.meta.env.PROD ? 'https://api.chainstore.site/api' : '/api');

export const http = axios.create({
  baseURL,
  timeout: 60000,
});

http.interceptors.request.use((config) => {
  const existing = config.headers?.Authorization || config.headers?.authorization;
  if (!existing) {
    const token = localStorage.getItem('chainstore_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('chainstore_token');
      localStorage.removeItem('chainstore_user');
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
