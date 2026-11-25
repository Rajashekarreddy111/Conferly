import axios from 'axios';

// Backend API Base URL strictly sourced from .env (BACKEND_URL)
// Automatically normalizes URL to guarantee it points to /api
const getApiBaseUrl = () => {
  let url = (import.meta.env.BACKEND_URL || 'http://localhost:8000/api').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('conf_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if backend explicitly returned 401 with an expired session
    if (error.response && error.response.status === 401 && error.response.data?.detail === 'Token expired') {
      localStorage.removeItem('conf_auth_token');
      localStorage.removeItem('conf_auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
