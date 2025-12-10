# USER_FRONTEND — State Management (Zustand)

## Обзор

Для управления глобальным состоянием используется **Zustand** — лёгкая библиотека для React.

**Преимущества**:
- Минимальный boilerplate
- Встроенная поддержка TypeScript
- Middleware для persist, devtools
- Не требует Provider (работает вне React)

---

## Структура stores

```
src/features/
├── auth/
│   └── store.ts         # Авторизация и пользователь
│
├── cart/
│   └── store.ts         # Корзина
│
├── favorites/
│   └── store.ts         # Избранное
│
└── notifications/
    └── store.ts         # Уведомления (опционально)
```

---

## Auth Store

**Расположение**: `src/features/auth/store.ts`

### Состояние

```typescript
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  phone: string | null;
  phone_verified: boolean;
  address: string | null;
  postal_code: string | null;
  birth_date: string | null;
  gender: 'male' | 'female' | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### Actions

```typescript
interface AuthActions {
  // Загрузка текущего пользователя
  fetchUser: () => Promise<void>;
  
  // Вход
  login: (email: string, password: string) => Promise<void>;
  
  // Регистрация
  register: (data: RegisterData) => Promise<void>;
  
  // Выход
  logout: () => Promise<void>;
  
  // Обновление профиля
  updateProfile: (data: Partial<User>) => Promise<void>;
  
  // Обновление токена
  refreshToken: () => Promise<void>;
  
  // Сброс состояния
  reset: () => void;
}
```

### Использование

```tsx
import { useAuthStore } from '@/features/auth/store';

function ProfileButton() {
  const { user, isAuthenticated, logout } = useAuthStore();
  
  if (!isAuthenticated) {
    return <LoginButton />;
  }
  
  return (
    <Menu>
      <Menu.Target>
        <Avatar src={user?.avatar_url} />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={logout}>Выйти</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

### Persist

Auth store НЕ персистится в localStorage — токены хранятся только в httpOnly cookies.

---

## Cart Store

**Расположение**: `src/features/cart/store.ts`

### Состояние

```typescript
interface CartItem {
  id: number;
  sku: {
    id: number;
    weight: string;
    price_cents: number;
    discount_cents: number;
    product: {
      id: number;
      title: string;
      slug: string;
      images: Array<{ url: string; is_main: boolean }>;
    };
  };
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}
```

### Computed

```typescript
// Общее количество товаров
const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

// Общая сумма (в копейках)
const totalPrice = items.reduce((sum, item) => {
  const price = item.sku.discount_cents || item.sku.price_cents;
  return sum + price * item.quantity;
}, 0);
```

### Actions

```typescript
interface CartActions {
  // Загрузить корзину с сервера
  fetchCart: () => Promise<void>;
  
  // Добавить товар
  addItem: (skuId: number, quantity?: number) => Promise<void>;
  
  // Обновить количество
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  
  // Удалить товар
  removeItem: (itemId: number) => Promise<void>;
  
  // Очистить корзину
  clearCart: () => Promise<void>;
  
  // Мерж гостевой корзины при авторизации
  mergeGuestCart: () => Promise<void>;
}
```

### Использование

```tsx
import { useCartStore } from '@/features/cart/store';

function AddToCartButton({ skuId }: { skuId: number }) {
  const { addItem, isLoading } = useCartStore();
  
  return (
    <Button 
      loading={isLoading}
      onClick={() => addItem(skuId)}
    >
      В корзину
    </Button>
  );
}

function CartIcon() {
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <ActionIcon>
      <IconShoppingCart />
      {totalItems > 0 && <Badge>{totalItems}</Badge>}
    </ActionIcon>
  );
}
```

### Guest Cart

Гостевая корзина поддерживается через `guest_session_id` cookie:
- При первом добавлении товара создаётся guest session
- При авторизации гостевая корзина мержится с основной

---

## Favorites Store

**Расположение**: `src/features/favorites/store.ts`

### Состояние

```typescript
interface FavoritesState {
  items: Product[];
  isLoading: boolean;
  error: string | null;
}
```

### Actions

```typescript
interface FavoritesActions {
  // Загрузить избранное
  fetchFavorites: () => Promise<void>;
  
  // Добавить в избранное
  addToFavorites: (productId: number) => Promise<void>;
  
  // Удалить из избранного
  removeFromFavorites: (productId: number) => Promise<void>;
  
  // Проверить, в избранном ли товар
  isFavorite: (productId: number) => boolean;
  
  // Переключить состояние
  toggleFavorite: (productId: number) => Promise<void>;
}
```

### Persist

Favorites store персистится в localStorage для быстрого отображения:

```typescript
import { persist } from 'zustand/middleware';

const useFavoritesStore = create(
  persist(
    (set, get) => ({
      // ...state and actions
    }),
    {
      name: 'favorites-storage',
    }
  )
);
```

---

## Селекторы

Для оптимизации ререндеров используйте селекторы:

```tsx
// ❌ Плохо — ререндер при любом изменении store
const { items, addItem } = useCartStore();

// ✅ Хорошо — ререндер только при изменении items
const items = useCartStore((state) => state.items);
const addItem = useCartStore((state) => state.addItem);

// ✅ Хорошо — вычисляемое значение
const totalItems = useCartStore((state) => 
  state.items.reduce((sum, item) => sum + item.quantity, 0)
);
```

---

## Middleware

### Devtools

Для отладки в React DevTools:

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({
      // ...
    }),
    { name: 'MyStore' }
  )
);
```

### Persist

Для сохранения в localStorage:

```typescript
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // ...
    }),
    {
      name: 'storage-key',
      partialize: (state) => ({ items: state.items }), // только часть состояния
    }
  )
);
```

---

## Инициализация при загрузке

В layout или корневом компоненте:

```tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useCartStore } from '@/features/cart/store';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const fetchCart = useCartStore((state) => state.fetchCart);
  
  useEffect(() => {
    fetchUser();
    fetchCart();
  }, []);
  
  return <>{children}</>;
}
```

---

## Тестирование

Mock store для тестов:

```tsx
import { useCartStore } from '@/features/cart/store';

beforeEach(() => {
  // Сброс состояния перед каждым тестом
  useCartStore.setState({
    items: [],
    isLoading: false,
    error: null,
  });
});

test('adds item to cart', async () => {
  const { addItem } = useCartStore.getState();
  await addItem(123);
  
  const { items } = useCartStore.getState();
  expect(items).toHaveLength(1);
});
```
