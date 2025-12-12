import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi, setAccessToken, setTokenRefreshCallback, cartApi } from '@/lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  firstname?: string;
  lastname?: string;
  middlename?: string;
  birthdate?: string;
  address?: string;
  postal_code?: string;
  phone_number?: string;
  avatar_url?: string;
  is_email_confirmed: boolean;
  is_phone_confirmed: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string, 
    username: string, 
    password: string,
    profile?: {
      firstname?: string;
      lastname?: string;
      middlename?: string;
      address?: string;
      postal_code?: string;
      phone_number?: string;
      birthdate?: string;
    }
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      setUser: (user) => set({ user }),
      
      setAccessToken: (token) => {
        setAccessToken(token);
        set({ accessToken: token });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // Логин устанавливает cookies на бэкенде
          const response = await userApi.login({ email, password });
          const { access_token } = response.data;
          
          // Устанавливаем токен для последующих запросов
          get().setAccessToken(access_token);
          
          // Получаем профиль пользователя
          const profileResponse = await userApi.getProfile();
          set({ user: profileResponse.data, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (
        email: string, 
        username: string, 
        password: string,
        profile?: {
          firstname?: string;
          lastname?: string;
          middlename?: string;
          address?: string;
          birthdate?: string;
        }
      ) => {
        set({ isLoading: true });
        try {
          await userApi.register({ 
            email, 
            username, 
            password,
            ...profile
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await userApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
        get().setAccessToken(null);
        set({ user: null });
      },

      checkAuth: async () => {
        // Проверяем только есть ли сохраненный токен
        const token = get().accessToken;
        if (!token) {
          set({ user: null, isLoading: false });
          return;
        }
        
        set({ isLoading: true });
        try {
          // Если токен есть, пробуем получить профиль
          // Interceptor автоматически обновит токен при 401
          const response = await userApi.getProfile();
          set({ user: response.data, isLoading: false });
        } catch (error: any) {
          // Логируем только в dev-режиме, 401 при первой загрузке — норма
          if (process.env.NODE_ENV === 'development' && error.response?.status !== 401) {
            console.warn('CheckAuth error:', error.response?.status, error.message);
          }
          
          // Если не получилось (refresh тоже провалился), очищаем состояние
          get().setAccessToken(null);
          set({ user: null, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        // Когда состояние восстановилось из localStorage, устанавливаем токен в API
        if (state?.accessToken) {
          setAccessToken(state.accessToken);
        }
        
        // Устанавливаем коллбэк для автоматического обновления токена в store
        setTokenRefreshCallback((newToken: string) => {
          state?.setAccessToken(newToken);
        });
      },
    }
  )
);

// Cart Store
interface CartItem {
  id: number;
  sku: {
    id: number;
    title: string;
    weight: number;
    price: number;  // Цена со скидкой
    original_price: number;  // Оригинальная цена
    discount: number;  // Скидка на товар
    image?: string;
  };
  quantity: number;
  total_cents: number;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;  // Сумма без скидок
  discountAmount: number;  // Скидки на товары
  promoDiscount: number;  // Скидка по промокоду
  promoCode: string | null;
  finalAmount: number;  // Итого со всеми скидками
  isLoading: boolean;
  fetchCart: (promoCode?: string) => Promise<void>;
  addItem: (skuId: number, quantity: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string }>;
  clearPromoCode: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalAmount: 0,
  discountAmount: 0,
  promoDiscount: 0,
  promoCode: null,
  finalAmount: 0,
  isLoading: false,

  fetchCart: async (promoCode?: string) => {
    set({ isLoading: true });
    try {
      const code = promoCode || get().promoCode;
      const response = await cartApi.getCart(code || undefined);
      set({ 
        items: response.data.items || [], 
        totalAmount: response.data.total_amount_cents || 0,
        discountAmount: response.data.discount_amount_cents || 0,
        promoDiscount: response.data.promo_discount_cents || 0,
        promoCode: response.data.promo_code || null,
        finalAmount: response.data.final_amount_cents || 0,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  addItem: async (skuId: number, quantity: number) => {
    set({ isLoading: true });
    try {
      const promoCode = get().promoCode;
      const response = await cartApi.addItem({ sku_id: skuId, quantity });
      // После добавления перезагружаем с промокодом
      if (promoCode) {
        await get().fetchCart(promoCode);
      } else {
        set({ 
          items: response.data.items || [], 
          totalAmount: response.data.total_amount_cents || 0,
          discountAmount: response.data.discount_amount_cents || 0,
          finalAmount: response.data.final_amount_cents || 0,
          isLoading: false 
        });
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateItem: async (itemId: number, quantity: number) => {
    // Оптимистичное обновление - сразу обновляем UI
    set((state) => {
      const updatedItems = state.items.map(item => {
        if (item.id === itemId) {
          const newTotal = item.sku.price * quantity;
          return { ...item, quantity, total_cents: newTotal };
        }
        return item;
      });
      const newFinal = updatedItems.reduce((sum, item) => sum + item.total_cents, 0) - state.promoDiscount;
      return { items: updatedItems, finalAmount: Math.max(0, newFinal) };
    });

    try {
      const promoCode = get().promoCode;
      await cartApi.updateItem(itemId, { quantity });
      // Перезагружаем с промокодом для актуальных расчётов
      await get().fetchCart(promoCode || undefined);
    } catch (error) {
      set({ isLoading: false });
      await get().fetchCart();
      throw error;
    }
  },

  removeItem: async (itemId: number) => {
    set({ isLoading: true });
    try {
      const promoCode = get().promoCode;
      await cartApi.removeItem(itemId);
      await get().fetchCart(promoCode || undefined);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearCart: async () => {
    set({ isLoading: true });
    try {
      await cartApi.clearCart();
      set({ 
        items: [], 
        totalAmount: 0, 
        discountAmount: 0,
        promoDiscount: 0,
        promoCode: null,
        finalAmount: 0,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  applyPromoCode: async (code: string) => {
    try {
      const response = await cartApi.applyPromoCode(code);
      // Перезагружаем корзину с примененным промокодом
      await get().fetchCart(code);
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Не удалось применить промокод';
      return { success: false, message };
    }
  },

  clearPromoCode: () => {
    set({ promoCode: null, promoDiscount: 0 });
    get().fetchCart();
  },
}));
