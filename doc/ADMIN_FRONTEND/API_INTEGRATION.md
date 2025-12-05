# API интеграция Admin Frontend

## Архитектура

### Генерация клиента

API клиент генерируется автоматически из OpenAPI спецификации Admin Backend.

```bash
npm run generate-client
```

**Источник**: `https://apiadmin.localtea.ru/api/v1/openapi.json`

**Результат**: Типизированные сервисы в `src/lib/api/`

### Структура

```
src/lib/
├── api/
│   ├── core/
│   │   ├── OpenAPI.ts          # Конфигурация
│   │   ├── request.ts          # HTTP функция
│   │   ├── CancelablePromise.ts
│   │   ├── ApiError.ts
│   │   └── ApiRequestOptions.ts
│   ├── models/                 # TypeScript типы
│   │   ├── Category.ts
│   │   ├── Product.ts
│   │   ├── ProductImage.ts
│   │   ├── SKU.ts
│   │   ├── OrderAdminResponse.ts
│   │   ├── UserAdminResponse.ts
│   │   └── ...
│   ├── services/               # API методы
│   │   ├── AuthService.ts
│   │   ├── CatalogService.ts
│   │   ├── OrdersService.ts
│   │   ├── UsersService.ts
│   │   └── DashboardService.ts
│   └── index.ts                # Re-exports
├── api-client.ts               # Настройка OpenAPI
└── axios.ts                    # Axios instance
```

---

## Конфигурация

### OpenAPI

**Путь**: `src/lib/api-client.ts`

```typescript
import { OpenAPI, AuthService } from './api';

// Configure the API client base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') 
  || 'https://apiadmin.localtea.ru';
OpenAPI.BASE = API_BASE;
```

### Axios

**Путь**: `src/lib/axios.ts`

```typescript
import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL 
  || 'https://apiadmin.localtea.ru/api/v1';

export const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor - добавляем токен и Content-Type
api.interceptors.request.use((config) => {
  // Для FormData не устанавливаем Content-Type
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('accessToken') 
    : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - обработка 401
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
```

---

## Сервисы

### AuthService

```typescript
// Вход
AuthService.loginApiV1AuthLoginPost({
  email: 'admin@example.com',
  password: 'password123'
});

// Настройка 2FA
AuthService.setup2FaApiV1Auth2FaSetupPost(tempToken);

// Проверка 2FA кода
AuthService.verify2FaApiV1Auth2FaVerifyPost({
  temp_token: tempToken,
  code: '123456'
});
```

### CatalogService

```typescript
// Категории
CatalogService.readCategoriesApiV1CatalogCategoriesGet();
CatalogService.createCategoryApiV1CatalogCategoriesPost(categoryData);
CatalogService.updateCategoryApiV1CatalogCategoriesIdPatch(id, updateData);
CatalogService.deleteCategoryApiV1CatalogCategoriesIdDelete(id);

// Товары
CatalogService.readProductsApiV1CatalogProductsGet({ skip: 0, limit: 20 });
CatalogService.readProductApiV1CatalogProductsIdGet(id);
CatalogService.createProductApiV1CatalogProductsPost(productData);
CatalogService.updateProductApiV1CatalogProductsIdPatch(id, updateData);
CatalogService.deleteProductApiV1CatalogProductsIdDelete(id);

// SKU
CatalogService.createSkuApiV1CatalogProductsProductIdSkusPost(productId, skuData);
CatalogService.updateSkuApiV1CatalogSkusIdPatch(skuId, updateData);
CatalogService.deleteSkuApiV1CatalogSkusIdDelete(skuId);

// Изображения (через axios для multipart/form-data)
// См. раздел "Загрузка файлов"
```

### OrdersService

```typescript
// Список заказов
OrdersService.readOrdersApiV1OrdersGet({ 
  skip: 0, 
  limit: 20, 
  status: 'PAID' 
});

// Детали заказа
OrdersService.readOrderApiV1OrdersIdGet(orderId);

// Смена статуса
OrdersService.updateOrderStatusApiV1OrdersIdStatusPatch(orderId, {
  status: 'SHIPPED'
});

// Отмена заказа
OrdersService.cancelOrderApiV1OrdersIdCancelPost(orderId);
```

### UsersService

```typescript
// Список пользователей
UsersService.readUsersApiV1UsersGet({ 
  skip: 0, 
  limit: 20, 
  search: 'john' 
});

// Детали пользователя
UsersService.readUserApiV1UsersUserIdGet(userId);

// Обновление пользователя
UsersService.updateUserApiV1UsersUserIdPatch(userId, updateData);

// Сброс 2FA
UsersService.reset2FaApiV1UsersUserIdReset2FaPost(userId);

// Имперсонация
UsersService.impersonateUserApiV1UsersUserIdImpersonatePost(userId);
```

### DashboardService

```typescript
// Статистика
DashboardService.getStatsApiV1DashboardStatsGet();
```

---

## React Query хуки

### Пример: Каталог

**Путь**: `src/features/catalog/hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CatalogService } from '@/lib/api';

// Получение списка товаров
export const useProducts = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => CatalogService.readProductsApiV1CatalogProductsGet(params),
  });
};

// Получение одного товара
export const useProduct = (id: number | null) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => CatalogService.readProductApiV1CatalogProductsIdGet(id!),
    enabled: id !== null,
  });
};

// Создание товара
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: CatalogService.createProductApiV1CatalogProductsPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notifications.show({
        title: 'Успешно',
        message: 'Товар создан',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось создать товар',
        color: 'red',
      });
    },
  });
};
```

### Пример: Блог

**Путь**: `src/features/blog/hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogService } from './api';
import { notifications } from '@mantine/notifications';

export const useArticles = (params?: { skip?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: () => BlogService.getArticles(params),
  });
};

export const useArticle = (id: number | null) => {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => BlogService.getArticle(id!),
    enabled: id !== null,
  });
};

export const useCreateArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: BlogService.createArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья создана',
        color: 'green',
      });
    },
  });
};

export const usePublishArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: BlogService.publishArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article'] });
      notifications.show({
        title: 'Успешно',
        message: 'Статья опубликована',
        color: 'green',
      });
    },
  });
};
```

---

## Загрузка файлов

Для загрузки файлов используется axios напрямую (не сгенерированный клиент).

### Загрузка изображения товара

```typescript
import { api, API_URL } from '@/lib/axios';
import { getValidToken } from '@/lib/api-client';

const uploadProductImage = async (productId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('is_main', 'false');
  formData.append('sort_order', '0');

  const token = await getValidToken();
  const response = await fetch(`${API_URL}/catalog/products/${productId}/images`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  return response.json();
};
```

### Загрузка изображения блога

```typescript
// src/features/blog/api.ts
async uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  // Не указываем Content-Type - axios сам установит с boundary
  const { data } = await api.post<{ url: string }>(
    '/blog/upload-image', 
    formData
  );
  return data.url;
}
```

---

## Обработка ошибок

### Глобальный interceptor

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 - редирект на логин
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    
    // 422 - ошибки валидации
    if (error.response?.status === 422) {
      const detail = error.response.data?.detail;
      // Показать ошибки полей
    }
    
    // 500 - серверная ошибка
    if (error.response?.status >= 500) {
      notifications.show({
        title: 'Ошибка сервера',
        message: 'Попробуйте позже',
        color: 'red',
      });
    }
    
    return Promise.reject(error);
  }
);
```

### В React Query

```typescript
useMutation({
  mutationFn: someApiCall,
  onError: (error: any) => {
    const message = error.response?.data?.detail || 'Произошла ошибка';
    notifications.show({
      title: 'Ошибка',
      message,
      color: 'red',
    });
  },
});
```

---

## Токены и авторизация

### Хранение

```typescript
// После успешного входа
localStorage.setItem('accessToken', data.access_token);
localStorage.setItem('refreshToken', data.refresh_token);
```

### Refresh токена

**Путь**: `src/lib/api-client.ts`

```typescript
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    window.location.href = '/login';
    return '';
  }
  
  const response = await fetch(`${OpenAPI.BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  
  if (!response.ok) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new Error('Refresh failed');
  }
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('refreshToken', data.refresh_token);
  }
  
  return data.access_token;
}
```

### Получение валидного токена

```typescript
export async function getValidToken(): Promise<string> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return refreshAccessToken();
  }
  
  // Проверка срока действия (опционально)
  // ...
  
  return token;
}
```
