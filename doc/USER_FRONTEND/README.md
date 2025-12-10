# USER_FRONTEND — Документация

## Обзор

`USER_FRONTEND` — публичное веб-приложение интернет-магазина чая LocalTea. Построено на Next.js 16 с использованием App Router и Mantine UI.

## Содержание

- [Архитектура](#архитектура)
- [Технологический стек](#технологический-стек)
- [Структура проекта](#структура-проекта)
- [Страницы приложения](#страницы-приложения)
- [Компоненты](#компоненты)
- [API интеграция](#api-интеграция)
- [Состояние приложения](#состояние-приложения)
- [Конфигурация](#конфигурация)
- [Развёртывание](#развёртывание)

---

## Архитектура

### Технологический стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | 16+ | React фреймворк с SSR/SSG |
| React | 19+ | UI библиотека |
| TypeScript | 5+ | Типизация |
| Mantine | 7+ | UI компоненты |
| Axios | 1+ | HTTP клиент |
| Zustand | 4+ | Управление состоянием |
| Tabler Icons | 3+ | Иконки |

### URL и доступ

| Среда | URL |
|-------|-----|
| Development | http://localhost:3000 |
| Production | https://localtea.ru |
| API Backend | https://api.localtea.ru/api/v1 |

---

## Структура проекта

```
user_frontend/
├── public/                    # Статические файлы
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Корневой layout (Header, Footer)
│   │   ├── page.tsx           # Главная страница
│   │   ├── globals.css        # Глобальные стили
│   │   ├── providers.tsx      # Провайдеры (Mantine, Auth)
│   │   │
│   │   ├── about/             # О компании
│   │   ├── blog/              # Блог
│   │   │   └── [slug]/        # Статья блога
│   │   ├── cart/              # Корзина и оформление заказа
│   │   ├── catalog/           # Каталог товаров
│   │   │   └── [slug]/        # Карточка товара
│   │   ├── confirm-email/     # Подтверждение email
│   │   ├── confirm-email-change/ # Подтверждение смены email
│   │   ├── for-business/      # Для бизнеса
│   │   ├── login/             # Вход в систему
│   │   ├── payment/
│   │   │   └── success/       # Успешная оплата
│   │   ├── profile/           # Личный кабинет
│   │   └── register/          # Регистрация
│   │
│   ├── components/            # React компоненты
│   │   ├── layout/            # Header, Footer, Navigation
│   │   ├── catalog/           # Компоненты каталога
│   │   ├── blog/              # Компоненты блога
│   │   ├── DeliveryDataBanner.tsx
│   │   ├── NotificationsContainer.tsx
│   │   └── PhoneVerificationModal.tsx
│   │
│   ├── lib/
│   │   ├── api.ts             # API клиент (axios)
│   │   └── theme.ts           # Тема Mantine
│   │
│   └── store/
│       └── index.ts           # Zustand store (auth)
│
├── .env.local                 # Локальные переменные окружения
├── next.config.ts             # Конфигурация Next.js
├── package.json
└── tsconfig.json
```

---

## Страницы приложения

### Главная страница (`/`)

- Hero секция с промо-баннером
- Популярные категории чая
- Избранные товары
- Преимущества магазина

### Каталог (`/catalog`)

- Сетка товаров с фильтрацией
- Фильтры по категории, типу чая
- Сортировка (по цене, популярности)
- Пагинация
- Поиск товаров

### Карточка товара (`/catalog/[slug]`)

- Галерея изображений
- Название, описание, характеристики
- Выбор фасовки (SKU)
- Цена с учётом скидки
- Кнопка добавления в корзину
- Инструкция по завариванию
- Комментарии и лайки

### Корзина и оформление заказа (`/cart`)

**3-шаговый процесс оформления (Stepper):**

1. **Корзина** — просмотр товаров, изменение количества, удаление
2. **Доставка** — выбор способа доставки:
   - Самовывоз (бесплатно)
   - Почта России (расчёт стоимости по API)
3. **Контакты и оплата** — ввод данных получателя:
   - ФИО
   - Телефон
   - Email
   - Адрес и индекс (для Почты России)
   - Переход к оплате через ЮKassa

### Страница успешной оплаты (`/payment/success`)

- Подтверждение создания заказа
- Автоматический переход к заказам через 10 секунд
- Кнопки "Мои заказы" и "На главную"

### Профиль (`/profile`)

**Вкладки:**

1. **Профиль** — основная информация, аватар
2. **Заказы** — история заказов с детализацией:
   - Статус заказа (Ожидает оплаты, Оплачен, Собирается, Передан в доставку, Доставлен, Отменён)
   - Способ доставки (Самовывоз / Почта России)
   - Трек-номер (если есть)
   - Кнопка оплаты для неоплаченных заказов
3. **Избранное** — сохранённые товары
4. **Настройки** — редактирование личных данных:
   - Имя, фамилия, отчество
   - Email (с подтверждением)
   - Телефон (с верификацией через звонок)
   - Адрес, индекс
   - Дата рождения
   - Смена пароля
   - Удаление аккаунта

### Блог (`/blog`)

- Список статей с превью
- Поиск по статьям
- Пагинация

### Статья блога (`/blog/[slug]`)

- Полный текст статьи
- Изображения
- Комментарии
- Лайки

### Авторизация

- **Вход** (`/login`) — email + пароль
- **Регистрация** (`/register`) — создание аккаунта с отправкой подтверждения на email
- **Подтверждение email** (`/confirm-email`) — активация аккаунта по ссылке или вручную

---

## Компоненты

### Layout компоненты

| Компонент | Описание |
|-----------|----------|
| `Header` | Шапка сайта с навигацией, поиском, корзиной |
| `Footer` | Подвал с контактами, ссылками, соцсетями |
| `Navigation` | Основное меню |

### Специальные компоненты

| Компонент | Описание |
|-----------|----------|
| `DeliveryDataBanner` | Баннер с предложением заполнить данные для доставки |
| `NotificationsContainer` | Контейнер для Mantine уведомлений |
| `PhoneVerificationModal` | Модальное окно верификации телефона |

---

## API интеграция

### Конфигурация (`src/lib/api.ts`)

API клиент на основе Axios с:
- Автоматическим добавлением CSRF токена из cookies
- Автоматическим обновлением Access токена при 401 ошибке
- Очередью запросов во время refresh токена

### API модули

#### `catalogApi`

```typescript
catalogApi.getCategories()                    // GET /catalog/categories
catalogApi.getProducts(params)                // GET /catalog/products
catalogApi.getProduct(slug)                   // GET /catalog/products/{slug}
```

#### `blogApi`

```typescript
blogApi.getArticles(params)                   // GET /blog/articles/
blogApi.getArticle(slug)                      // GET /blog/articles/{slug}
```

#### `userApi`

```typescript
userApi.register(data)                        // POST /user/registration
userApi.login(data)                           // POST /user/login
userApi.logout()                              // POST /user/logout
userApi.getProfile()                          // GET /user/get-profile
userApi.refresh()                             // POST /user/refresh

// Редактирование профиля
userApi.updateFirstname(data)                 // POST /user/change-firstname
userApi.updateLastname(data)                  // POST /user/change-lastname
userApi.updateMiddlename(data)                // POST /user/change-middlename
userApi.updateBirthdate(data)                 // POST /user/change-birthdate
userApi.updateAddress(data)                   // POST /user/change-address
userApi.updatePostalCode(data)                // POST /user/change-postal-code
userApi.updatePhoneNumber(data)               // POST /user/change-phone-number
userApi.uploadAvatar(file)                    // POST /user/upload-avatar
userApi.changePassword(data)                  // POST /user/change-password
userApi.changeEmail(data)                     // POST /user/change-email
userApi.changeUsername(data)                  // POST /user/change-username

// Подтверждение email
userApi.confirmEmail(token)                   // POST /user/confirm-email
userApi.confirmEmailChange(token)             // GET /user/confirm-email-change

// Верификация телефона
userApi.startPhoneVerification()              // POST /user/phone-verification/start
userApi.checkPhoneVerification()              // GET /user/phone-verification/status

// Удаление аккаунта
userApi.deleteAccount(password)               // DELETE /user/account
```

#### `cartApi`

```typescript
cartApi.getCart()                             // GET /cart
cartApi.addItem(data)                         // POST /cart/items
cartApi.updateItem(id, data)                  // PATCH /cart/items/{id}
cartApi.removeItem(id)                        // DELETE /cart/items/{id}
cartApi.clearCart()                           // DELETE /cart
```

#### `deliveryApi`

```typescript
deliveryApi.getMethods()                      // GET /delivery/methods
deliveryApi.calculate(data)                   // POST /delivery/calculate
```

#### `orderApi`

```typescript
orderApi.checkout(data)                       // POST /orders/checkout
orderApi.getOrders()                          // GET /orders
orderApi.getOrder(id)                         // GET /orders/{id}
```

#### `interactionsApi`

```typescript
interactionsApi.getComments(params)           // GET /interactions/comments
interactionsApi.createComment(data)           // POST /interactions/comments
interactionsApi.deleteComment(id)             // DELETE /interactions/comments/{id}
interactionsApi.toggleLike(data)              // POST /interactions/likes
interactionsApi.registerView(data)            // POST /interactions/views
```

---

## Состояние приложения

### Zustand Store (`src/store/index.ts`)

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

**Особенности:**
- Persist состояние в localStorage (только accessToken)
- Автоматическая проверка авторизации при загрузке
- Синхронизация с API клиентом

---

## Конфигурация

### Переменные окружения (`.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api.localtea.ru/api/v1
```

### Next.js конфигурация (`next.config.ts`)

```typescript
{
  rewrites: [
    // Проксирование API запросов
    { source: '/api/v1/:path*', destination: 'http://backend:8000/api/v1/:path*' }
  ],
  images: {
    remotePatterns: [
      { hostname: 'api.localtea.ru' }
    ]
  }
}
```

---

## Тема и стили

### Mantine Theme (`src/lib/theme.ts`)

Кастомная тема с цветовой палитрой LocalTea:
- Основной цвет: `#d4894f` (тёплый оранжево-коричневый)
- Тёмный фон: `#16100c`, `#24180e`
- Текст: `#fbf6ee`, `#e8dcc8`

### Глобальные стили (`src/app/globals.css`)

- Тёмная тема по умолчанию
- Градиентные фоны
- Кастомные стили для карточек

---

## Развёртывание

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Запуск в development

```bash
cd user_frontend
npm install
npm run dev
```

### Сборка для production

```bash
npm run build
npm start
```

---

## Связанная документация

### Фронтенд документация

- [COMPONENTS.md](COMPONENTS.md) — Компоненты приложения
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) — Zustand stores (auth, cart, favorites)
- [API_REFERENCE.md](API_REFERENCE.md) — Справочник по API клиенту
- [PAYMENT.md](PAYMENT.md) — Интеграция платежей YooKassa

### Бэкенд документация

- [USER_BACKEND README](../USER_BACKEND/README.md)
- [API модуль Orders](../USER_BACKEND/API_MODULES/Orders.md)
- [API модуль Cart](../USER_BACKEND/API_MODULES/Cart.md)
- [API модуль Payment](../USER_BACKEND/API_MODULES/Payment.md)
- [API модуль Delivery](../USER_BACKEND/API_MODULES/Delivery.md)
