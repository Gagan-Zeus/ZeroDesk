import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zerodesk_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally — only redirect for full-scope requests, not during auth flow
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthRoute = ['/auth/', '/otp/'].some((p) => err.config?.url?.includes(p));
      if (!isAuthRoute) {
        localStorage.removeItem('zerodesk_token');
        if (!['/login', '/auth/otp', '/auth/email', '/auth/github-email', '/'].includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
