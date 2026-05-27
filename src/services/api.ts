import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3003/api',
    timeout: 10000,
});

// Interceptor para injetar o Token JWT em cada requisição automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ponto_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;