import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAccessToken = () => accessToken;

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
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const response = await api.post('/user/refresh');
        const newToken = response.data.access_token;
        setAccessToken(newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
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
  register: (data: { email: string; username: string; password: string }) => 
    api.post('/user/registration', data),
  login: (data: { email: string; password: string }) => 
    api.post('/user/login', data),
  logout: () => api.post('/user/logout'),
  getProfile: () => api.get('/user/get-profile'),
  refresh: () => api.post('/user/refresh'),
};

export const cartApi = {
  getCart: () => api.get('/cart'),
  addItem: (data: { sku_id: number; quantity: number }) => 
    api.post('/cart/items', data),
  updateItem: (id: number, data: { quantity: number }) => 
    api.patch(`/cart/items/${id}`, data),
  removeItem: (id: number) => api.delete(`/cart/items/${id}`),
  clearCart: () => api.delete('/cart'),
};

export const interactionsApi = {
  getComments: (params: { article_id?: number; product_id?: number; skip?: number; limit?: number }) =>
    api.get('/interactions/comments/', { params }),
  createComment: (data: { content: string; article_id?: number; product_id?: number }) =>
    api.post('/interactions/comments/', data),
  deleteComment: (id: number) => api.delete(`/interactions/comments/${id}`),
  toggleLike: (data: { article_id?: number; product_id?: number; comment_id?: number }) =>
    api.post('/interactions/likes/', data),
  registerView: (data: { article_id?: number; product_id?: number }) =>
    api.post('/interactions/views/', data),
};
