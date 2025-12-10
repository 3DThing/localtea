# USER_FRONTEND — API Reference

## API клиент

Расположение: `src/lib/api.ts`

### Конфигурация

```typescript
const API_BASE_URL = '/api/v1';  // Проксируется через Next.js

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Interceptors

#### Request Interceptor
- Автоматически добавляет CSRF токен из cookies в заголовок `X-CSRF-Token`.

#### Response Interceptor
- При получении 401 ошибки автоматически пытается обновить Access Token.
- Использует очередь запросов для предотвращения множественных refresh.
- При неудачном refresh очищает токен и перенаправляет на логин.

---

## API модули

### catalogApi

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `getCategories()` | GET `/catalog/categories` | Список категорий |
| `getProducts(params)` | GET `/catalog/products` | Список товаров с фильтрами |
| `getProduct(slug)` | GET `/catalog/products/{slug}` | Детали товара |

**Параметры getProducts:**
```typescript
{
  page?: number;
  limit?: number;
  category_id?: number;
  tea_type?: string;
  sort?: string;
  q?: string;  // поиск
}
```

### blogApi

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `getArticles(params)` | GET `/blog/articles/` | Список статей |
| `getArticle(slug)` | GET `/blog/articles/{slug}` | Детали статьи |

### userApi

#### Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `register(data)` | POST `/user/registration` | Регистрация |
| `login(data)` | POST `/user/login` | Вход |
| `logout()` | POST `/user/logout` | Выход |
| `getProfile()` | GET `/user/get-profile` | Профиль |
| `refresh()` | POST `/user/refresh` | Обновление токена |

#### Редактирование профиля

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `updateFirstname(data)` | POST `/user/change-firstname` | Изменить имя |
| `updateLastname(data)` | POST `/user/change-lastname` | Изменить фамилию |
| `updateMiddlename(data)` | POST `/user/change-middlename` | Изменить отчество |
| `updateBirthdate(data)` | POST `/user/change-birthdate` | Изменить дату рождения |
| `updateAddress(data)` | POST `/user/change-address` | Изменить адрес |
| `updatePostalCode(data)` | POST `/user/change-postal-code` | Изменить индекс |
| `updatePhoneNumber(data)` | POST `/user/change-phone-number` | Изменить телефон |
| `uploadAvatar(file)` | POST `/user/upload-avatar` | Загрузить аватар |
| `changePassword(data)` | POST `/user/change-password` | Сменить пароль |
| `changeEmail(data)` | POST `/user/change-email` | Сменить email |
| `changeUsername(data)` | POST `/user/change-username` | Сменить username |

#### Email подтверждение

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `confirmEmail(token)` | POST `/user/confirm-email` | Подтвердить email |
| `confirmEmailChange(token)` | GET `/user/confirm-email-change` | Подтвердить смену email |

#### Верификация телефона

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `startPhoneVerification()` | POST `/user/phone-verification/start` | Начать верификацию |
| `checkPhoneVerification()` | GET `/user/phone-verification/status` | Проверить статус |

#### Удаление аккаунта

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `deleteAccount(password)` | DELETE `/user/account` | Удалить аккаунт |

### cartApi

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `getCart()` | GET `/cart` | Получить корзину |
| `addItem(data)` | POST `/cart/items` | Добавить товар |
| `updateItem(id, data)` | PATCH `/cart/items/{id}` | Изменить количество |
| `removeItem(id)` | DELETE `/cart/items/{id}` | Удалить товар |
| `clearCart()` | DELETE `/cart` | Очистить корзину |

### deliveryApi

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `getMethods()` | GET `/delivery/methods` | Методы доставки |
| `calculate(data)` | POST `/delivery/calculate` | Рассчитать стоимость |

**Параметры calculate:**
```typescript
{
  postal_code: string;  // 6 цифр
  weight_grams: number;
}
```

### orderApi

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `checkout(data)` | POST `/orders/checkout` | Оформить заказ |
| `getOrders()` | GET `/orders` | Список заказов |
| `getOrder(id)` | GET `/orders/{id}` | Детали заказа |

**Параметры checkout:**
```typescript
{
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
}
```

### interactionsApi

| Метод | Endpoint | Описание |
|-------|----------|----------|
| `getComments(params)` | GET `/interactions/comments` | Получить комментарии |
| `createComment(data)` | POST `/interactions/comments` | Создать комментарий |
| `deleteComment(id)` | DELETE `/interactions/comments/{id}` | Удалить комментарий |
| `toggleLike(data)` | POST `/interactions/likes` | Поставить/убрать лайк |
| `registerView(data)` | POST `/interactions/views` | Зарегистрировать просмотр |

---

## Управление состоянием (Zustand)

### AuthStore (`src/store/index.ts`)

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
```

### Использование

```typescript
import { useAuthStore } from '@/store';

// В компоненте
const { user, isLoading, login, logout, checkAuth } = useAuthStore();

// Проверка авторизации при загрузке
useEffect(() => {
  checkAuth();
}, []);

// Вход
await login(email, password);

// Выход
await logout();
```
