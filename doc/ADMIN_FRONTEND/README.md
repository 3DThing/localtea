# Документация Admin Frontend (LocalTea)

## Обзор

**Admin Frontend** — это веб-приложение для управления платформой LocalTea. Предоставляет интуитивно понятный интерфейс для администраторов и менеджеров.

**URL Production**: `https://admin.localtea.ru`

## Технологический стек

### Core
| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | 16.0.7 | React фреймворк с App Router |
| TypeScript | 5+ | Типизация |
| React | 19 | UI библиотека |

### UI & UX
| Технология | Версия | Назначение |
|------------|--------|------------|
| Mantine | 7.x | UI компоненты |
| @mantine/notifications | 7.x | Система уведомлений |
| @mantine/dates | 7.x | Компоненты дат (Day.js) |
| @mantine/charts | 7.x | Графики (Recharts) |
| @mantine/dropzone | 7.x | Drag & Drop загрузка файлов |
| @tabler/icons-react | - | Иконки |
| TipTap | 2.x | WYSIWYG редактор |

### Data & State
| Технология | Версия | Назначение |
|------------|--------|------------|
| TanStack Query | 5.x | Серверный стейт, кэширование |
| Axios | - | HTTP клиент |
| react-hook-form | - | Формы |
| Zod | - | Валидация |

### API Client
| Технология | Назначение |
|------------|------------|
| openapi-typescript-codegen | Генерация типизированного API клиента |

## Архитектура

### Структура проекта

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Группа авторизации
│   │   └── login/page.tsx      # Страница входа
│   ├── dashboard/              # Защищённая зона
│   │   ├── layout.tsx          # Layout с сайдбаром
│   │   ├── page.tsx            # Главный дашборд
│   │   ├── blog/               # Управление блогом
│   │   │   ├── page.tsx        # Список статей
│   │   │   └── [id]/page.tsx   # Редактор статьи
│   │   ├── catalog/            # Каталог
│   │   │   ├── page.tsx        # Товары
│   │   │   ├── categories/[id]/page.tsx
│   │   │   └── products/[id]/page.tsx
│   │   ├── orders/page.tsx     # Заказы
│   │   └── users/page.tsx      # Пользователи
│   ├── layout.tsx              # Root layout (Providers)
│   ├── page.tsx                # Redirect на /dashboard
│   └── providers.tsx           # React Query, Mantine providers
│
├── components/
│   ├── layout/
│   │   ├── MainLayout.tsx      # Основной layout
│   │   ├── AppSidebar.tsx      # Боковое меню
│   │   └── AppHeader.tsx       # Верхняя панель
│   ├── shared/
│   │   └── RichTextEditor/     # TipTap редактор
│   └── AuthGuard.tsx           # Защита роутов
│
├── features/                   # Feature-Sliced модули
│   ├── auth/                   # Авторизация
│   │   └── components/
│   ├── blog/                   # Блог
│   │   ├── api.ts              # BlogService
│   │   ├── hooks.ts            # useArticles, useArticle
│   │   ├── types.ts            # Article, ArticleCreate
│   │   └── components/
│   ├── catalog/                # Каталог
│   │   └── components/
│   │       ├── CategoryModal.tsx
│   │       ├── ProductModal.tsx
│   │       └── ProductForm/
│   ├── orders/                 # Заказы
│   │   └── components/
│   └── users/                  # Пользователи
│       └── components/
│           └── UserEditModal.tsx
│
└── lib/
    ├── api/                    # Сгенерированный API клиент
    │   ├── core/               # OpenAPI core
    │   ├── models/             # TypeScript модели
    │   └── services/           # API сервисы
    ├── api-client.ts           # Настройка OpenAPI клиента
    └── axios.ts                # Axios instance с interceptors
```

## Модули

### 1. Авторизация (Auth)

**Путь**: `/login`

Двухэтапный процесс входа:
1. Ввод email и пароля
2. Ввод 2FA кода (TOTP)

При первом входе администратора отображается QR-код для настройки 2FA.

**Компоненты**:
- `LoginForm` — форма входа
- `TwoFASetup` — настройка 2FA с QR-кодом
- `TwoFAVerify` — ввод 6-значного кода

### 2. Дашборд (Dashboard)

**Путь**: `/dashboard`

Сводная информация:
- **Stat Cards**: Заказы за сегодня, выручка, новые пользователи
- **График продаж**: AreaChart за последние 30 дней
- **Audit Log**: Последние действия администраторов

### 3. Каталог (Catalog)

**Путь**: `/dashboard/catalog`

#### Категории
- Древовидная структура (parent/child)
- CRUD в модальных окнах
- Загрузка изображений категорий
- SEO поля (title, description)

#### Товары
- Таблица с фильтрацией и поиском
- Редактирование на отдельной странице (`/dashboard/catalog/products/[id]`)
- Табы: Основное, Изображения, SKU, SEO
- Drag & Drop для загрузки изображений
- Автоконвертация в WebP

#### SKU (Вариации)
- Управление ценами, весом, остатками
- Скидки (% или фиксированные)

### 4. Заказы (Orders)

**Путь**: `/dashboard/orders`

- Таблица заказов с пагинацией
- Фильтрация по статусу (табы)
- Цветовые бейджи статусов
- Детали заказа в Drawer
- Смена статуса заказа

### 5. Пользователи (Users)

**Путь**: `/dashboard/users`

- Таблица пользователей с поиском
- Редактирование в модальном окне
- Действия:
  - Блокировка/разблокировка
  - Сброс 2FA
  - Имперсонация (вход под пользователем)

### 6. Блог (Blog)

**Путь**: `/dashboard/blog`

- Список статей с поиском и фильтрацией
- Редактор статьи (`/dashboard/blog/[id]`)
- Табы: Содержание, Обложка, Предпросмотр, Настройки
- **TipTap WYSIWYG редактор**:
  - Заголовки (H1, H2, H3)
  - Форматирование (bold, italic, underline, strike)
  - Выделение текста (highlight)
  - Списки (маркированные, нумерованные)
  - Цитаты (blockquote)
  - Код (inline и блоки)
  - Ссылки
  - Изображения с загрузкой
  - Выравнивание текста
- Публикация/снятие с публикации
- Предпросмотр статьи

## Конфигурация

### Переменные окружения

```env
# .env.local
NEXT_PUBLIC_API_URL=https://apiadmin.localtea.ru/api/v1
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]
```

### docker-compose.yml

```yaml
admin_frontend:
  build:
    context: ./admin_frontend
    dockerfile: Dockerfile
  ports:
    - "3001:3000"
  volumes:
    - ./admin_frontend:/app
  environment:
    - WATCHPACK_POLLING=true
    - NEXT_PUBLIC_API_URL=https://apiadmin.localtea.ru/api/v1
```

## API интеграция

### Генерация клиента

```bash
npm run generate-client
```

Источник: `https://apiadmin.localtea.ru/api/v1/openapi.json`

### Использование

```typescript
import { CatalogService } from '@/lib/api';

// В компоненте
const { data } = await CatalogService.readProducts({ skip: 0, limit: 10 });
```

### React Query хуки

```typescript
// features/catalog/hooks.ts
export const useProducts = (params) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => CatalogService.readProducts(params)
  });
};
```

## UI/UX

### Темы
- Светлая тема (по умолчанию)
- Тёмная тема (переключатель в header)

### Цветовая палитра
- **Primary**: Зелёный (Teal) — тематика чая
- **Danger**: Красный — удаления, блокировки
- **Warning**: Оранжевый — ожидающие статусы
- **Success**: Зелёный — успешные операции

### Layout
- **Sidebar**: Сворачиваемое меню навигации
- **Header**: Breadcrumbs, переключатель темы, профиль
- **Content**: Основная область с Paper контейнерами

### Паттерны
- **Таблицы**: Пагинация, сортировка, поиск с debounce
- **Формы**: Валидация Zod, ошибки под полями, loading state
- **Уведомления**: Toast в правом верхнем углу
- **Подтверждения**: Modal для опасных действий

## Безопасность

### Аутентификация
- JWT токены (access + refresh)
- Хранение в localStorage (`accessToken`, `refreshToken`)
- Автоматический refresh при 401

### Защита роутов
- `AuthGuard` компонент проверяет наличие токена
- Redirect на `/login` при отсутствии авторизации

### CORS
- Фронтенд работает только с доменом `apiadmin.localtea.ru`
- Ограничение доступа по IP на уровне NGINX (только для доверенной VPN сети!)

## Разработка

### Запуск локально

```bash
cd admin_frontend
npm install
npm run dev
```

### Запуск в Docker

```bash
docker-compose up -d admin_frontend
```

### Линтинг

```bash
npm run lint
```

### Сборка

```bash
npm run build
```

## Changelog

### [1.0.0] - 2025-12-05

#### Добавлено
- Полная интеграция с Admin Backend API
- Модуль авторизации с 2FA
- Дашборд со статистикой и графиками
- Управление каталогом (категории, товары, SKU, изображения)
- Управление заказами
- Управление пользователями с имперсонацией
- Модуль блога с TipTap WYSIWYG редактором
- Предпросмотр статей
- Тёмная/светлая тема
- Адаптивный layout
