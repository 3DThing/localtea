import axios from 'axios';

// API URL из переменной окружения
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apiadmin.localtea.ru/api/v1';

// Base URL без /api/v1 для прямых fetch запросов
export const API_BASE_URL = API_URL.replace('/api/v1', '');

export const api = axios.create({
  baseURL: API_URL,
});

// Интерсептор для установки Content-Type только для JSON
api.interceptors.request.use((config) => {
  // Если данные не FormData, устанавливаем JSON
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  // Для FormData браузер сам установит Content-Type с boundary
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
