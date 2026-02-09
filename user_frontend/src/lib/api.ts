import axios from 'axios';

// В браузере всегда используем относительный путь для проксирования через Next.js
const API_BASE_URL = typeof window !== 'undefined' 
  ? '/api/v1'
  : 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SESSION_ID_STORAGE_KEY = 'localtea_session_id';

const getStoredSessionId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeSessionId = (sessionId: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch {
    // ignore
  }
};

// Auth token management
let accessToken: string | null = null;
let onTokenRefresh: ((token: string) => void) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAccessToken = () => accessToken;

export const setTokenRefreshCallback = (callback: (token: string) => void) => {
  onTokenRefresh = callback;
};

// Request interceptor to add CSRF token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf_token='))
      ?.split('=')[1];
    
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Для анонимных пользователей поддерживаем сессию через X-Session-ID
    const sessionId = getStoredSessionId();
    if (sessionId && !config.headers['X-Session-ID']) {
      config.headers['X-Session-ID'] = sessionId;
    }
  }
  return config;
});

// Response interceptor with automatic token refresh on 401
let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: any) => void; reject: (reason?: any) => void; config: any}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      if (token && prom.config.headers) {
        prom.config.headers['Authorization'] = `Bearer ${token}`;
      }
      prom.resolve(api(prom.config));
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      const sessionId = (response.headers?.['x-session-id'] as string | undefined) ||
                        (response.headers?.['X-Session-ID'] as string | undefined);
      if (sessionId) {
        storeSessionId(sessionId);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Не пытаемся refresh для эндпоинтов авторизации или если уже пробовали
    const isAuthEndpoint = originalRequest.url?.includes('/user/refresh') ||
                           originalRequest.url?.includes('/user/login') ||
                           originalRequest.url?.includes('/user/registration');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Если refresh уже идёт, добавляем запрос в очередь
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/user/refresh');
        const newToken = refreshResponse.data.access_token;
        setAccessToken(newToken);
        
        // Уведомляем store об обновлении токена
        if (onTokenRefresh) {
          onTokenRefresh(newToken);
        }
        
        // Обновляем токен в исходном запросе
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        
        processQueue(null, newToken);
        isRefreshing = false;
        
        // Повторяем исходный запрос с новым токеном
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Если refresh не удался, очищаем токен
        setAccessToken(null);
        
        // Если ошибка "Refresh token missing" или "Invalid refresh token" - это нормальная ситуация
        // (пользователь не авторизован или сессия истекла), не логируем как ошибку
        const errorDetail = refreshError?.response?.data?.detail;
        const isExpectedAuthError = errorDetail === 'Refresh token missing' || 
                                    errorDetail === 'Invalid refresh token' ||
                                    errorDetail === 'Session invalid (context changed)';
        
        if (!isExpectedAuthError && process.env.NODE_ENV === 'development') {
          console.warn('Token refresh failed:', errorDetail || refreshError.message);
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const catalogApi = {
  getCategories: () => api.get('/catalog/categories'),
  getProducts: (params?: { 
    page?: number; 
    limit?: number; 
    category_id?: number; 
    tea_type?: string; 
    sort?: string; 
    q?: string 
  }) => api.get('/catalog/products', { params }),
  getProduct: (slug: string) => api.get(`/catalog/products/${slug}`),
};

export const blogApi = {
  getArticles: (params?: { skip?: number; limit?: number; search?: string }) => 
    api.get('/blog/articles/', { params }),
  getArticle: (slug: string) => api.get(`/blog/articles/${slug}`),
};

export const userApi = {
  register: (data: { 
    email: string; 
    username: string; 
    password: string;
    firstname?: string;
    lastname?: string;
    middlename?: string;
    address?: string;
    birthdate?: string;
  }) => 
    api.post('/user/registration', data),
  login: (data: { email: string; password: string }) => 
    api.post('/user/login', data),
  logout: () => api.post('/user/logout'),
  getProfile: () => api.get('/user/get-profile'),
  refresh: () => api.post('/user/refresh'),
  // Personal info updates
  updateFirstname: (data: { firstname: string }) => 
    api.post('/user/change-firstname', data),
  updateLastname: (data: { lastname: string }) => 
    api.post('/user/change-lastname', data),
  updateMiddlename: (data: { middlename: string }) => 
    api.post('/user/change-middlename', data),
  updateBirthdate: (data: { birthdate: string }) => 
    api.post('/user/change-birthdate', data),
  updateAddress: (data: { address: string }) => 
    api.post('/user/change-address', data),
  updatePostalCode: (data: { postal_code: string }) => 
    api.post('/user/change-postal-code', data),
  updatePhoneNumber: (data: { phone_number: string }) => 
    api.post('/user/change-phone-number', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/user/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  changePassword: (data: { old_password: string; new_password: string }) => 
    api.post('/user/change-password', data),
  changeEmail: (data: { email: string }) => 
    api.post('/user/change-email', data),
  changeUsername: (data: { username: string }) => 
    api.post('/user/change-username', data),
  // Email confirmation
  confirmEmail: (token: string) => 
    api.post('/user/confirm-email', null, { params: { token } }),
  confirmEmailChange: (token: string) => 
    api.get('/user/confirm-email-change', { params: { token } }),
  // Phone verification
  startPhoneVerification: () => 
    api.post('/user/phone-verification/start'),
  checkPhoneVerification: () => 
    api.get('/user/phone-verification/status'),
  // Account deletion
  deleteAccount: (password: string) =>
    api.delete('/user/account', { data: { password } }),
};

export const cartApi = {
  getCart: (promoCode?: string) => api.get('/cart', { params: promoCode ? { promo_code: promoCode } : undefined }),
  addItem: (data: { sku_id: number; quantity: number }) => 
    api.post('/cart/items', data),
  updateItem: (id: number, data: { quantity: number }) => 
    api.patch(`/cart/items/${id}`, data),
  removeItem: (id: number) => api.delete(`/cart/items/${id}`),
  clearCart: () => api.delete('/cart'),
  applyPromoCode: (code: string) => api.post('/cart/promo', { code }),
};

export const deliveryApi = {
  getMethods: () => api.get('/delivery/methods'),
  calculate: (data: { postal_code: string; weight_grams: number }) =>
    api.post('/delivery/calculate', data),
};

export const orderApi = {
  checkout: (data: {
    delivery_method: 'pickup' | 'russian_post';
    contact_info: {
      firstname: string;
      lastname: string;
      middlename?: string;
      phone: string;
      email: string;
    };
    shipping_address?: {
      postal_code: string;
      address: string;
    };
    delivery_cost_cents: number;
    payment_method?: string;
    promo_code?: string;
  }) => api.post('/orders/checkout', data),
  getOrders: () => api.get('/orders'),
  getOrder: (id: number) => api.get(`/orders/${id}`),
};

export const interactionsApi = {
  getComments: (params: { article_id?: number; product_id?: number; skip?: number; limit?: number }) =>
    api.get('/interactions/comments', { params }),
  createComment: (data: { content: string; article_id?: number; product_id?: number }) =>
    api.post('/interactions/comments', data),
  deleteComment: (id: number) => api.delete(`/interactions/comments/${id}`),
  reportComment: (id: number, data: { reason: string }) =>
    api.post(`/interactions/comments/${id}/report`, data),
  toggleLike: (data: { article_id?: number; product_id?: number; comment_id?: number }) =>
    api.post('/interactions/likes', data),
  registerView: (data: { article_id?: number; product_id?: number }) =>
    api.post('/interactions/views', data),
};
