# USER_BACKEND — Документация

## Обзор

USER_BACKEND — серверная часть интернет-магазина чая LocalTea. Построена на FastAPI с асинхронной архитектурой.

## Содержание

- [Технологический стек](#технологический-стек)
- [Архитектура](#архитектура)
- [API модули](#api-модули)
- [Установка и запуск](#установка-и-запуск)
- [Безопасность](#безопасность)
- [Связанная документация](#связанная-документация)

---

## Технологический стек

| Компонент | Технология | Версия |
|-----------|------------|--------|
| Язык | Python | 3.10+ |
| Фреймворк | FastAPI | 0.100+ |
| ORM | SQLAlchemy | 2.0+ (async) |
| БД | PostgreSQL | 15+ |
| Драйвер БД | asyncpg | - |
| Миграции | Alembic | - |
| Кэш/Брокер | Redis | 7+ |
| Очередь задач | Celery | 5+ |
| Валидация | Pydantic | 2.0+ |
| Сервер | Uvicorn | - |
| Хеширование | Argon2 (passlib) | - |
| JWT | python-jose | - |
| HTTP клиент | httpx | - |

---

## Архитектура

### Структура директорий

```
backend/
├── api/                    # Слой представления (endpoints)
│   └── v1/
│       ├── api.py          # Главный роутер
│       ├── user/           # Аутентификация, профиль
│       ├── catalog/        # Каталог товаров
│       ├── cart/           # Корзина
│       ├── order/          # Заказы
│       ├── delivery/       # Расчёт доставки
│       ├── blog/           # Статьи блога
│       ├── interactions/   # Комментарии, лайки, просмотры
│       └── webhooks/       # Webhooks (ЮKassa)
│
├── core/                   # Ядро приложения
│   ├── config.py           # Настройки (из .env)
│   ├── security.py         # JWT, хеширование
│   ├── limiter.py          # Rate limiting
│   ├── cache.py            # Redis кэширование
│   ├── celery_app.py       # Конфигурация Celery
│   └── logger.py           # Логирование
│
├── crud/                   # CRUD операции с БД
│   ├── base.py             # Базовый класс CRUD
│   ├── crud_user.py
│   ├── crud_catalog.py
│   ├── crud_blog.py
│   └── crud_interactions.py
│
├── db/                     # База данных
│   ├── session.py          # Async session
│   └── base_class.py       # Base model
│
├── dependencies/           # FastAPI dependencies
│   ├── deps.py             # Общие зависимости
│   └── deps_interactions.py
│
├── models/                 # SQLAlchemy модели
│   ├── user.py
│   ├── token.py
│   ├── catalog.py          # Product, Category, SKU
│   ├── cart.py             # Cart, CartItem
│   ├── order.py            # Order, OrderItem, Payment
│   ├── blog.py             # Article
│   └── interactions.py     # Comment, Like, View
│
├── schemas/                # Pydantic схемы (DTO)
│   ├── user.py
│   ├── catalog.py
│   ├── cart.py
│   ├── order.py
│   ├── blog.py
│   └── interactions.py
│
├── services/               # Бизнес-логика
│   ├── user.py             # Регистрация, авторизация
│   ├── cart.py             # Операции с корзиной
│   ├── order.py            # Оформление заказов
│   ├── delivery.py         # Расчёт доставки (Почта России)
│   ├── phone_verification.py # Верификация телефона
│   └── payment/
│       ├── base.py         # Интерфейс платёжного сервиса
│       └── yookassa.py     # Интеграция с ЮKassa
│
├── templates/              # HTML шаблоны (email)
│   ├── base.html
│   └── verification.html
│
├── utils/                  # Утилиты
│   └── email.py            # Отправка email (SMTP)
│
├── main.py                 # Точка входа FastAPI
└── worker.py               # Celery worker
```

### Слои приложения

1. **API Layer** (`api/`) — HTTP endpoints, валидация запросов.
2. **Service Layer** (`services/`) — Бизнес-логика.
3. **Data Access Layer** (`crud/`) — Операции с БД.
4. **Domain Layer** (`models/`) — ORM модели.

---

## API модули

| Модуль | Префикс | Описание | Документация |
|--------|---------|----------|--------------|
| Users | `/user` | Регистрация, авторизация, профиль | [Users.md](API_MODULES/Users.md) |
| Catalog | `/catalog` | Категории, товары, SKU | [Catalog.md](API_MODULES/Catalog.md) |
| Cart | `/cart` | Корзина покупок | [Cart.md](API_MODULES/Cart.md) |
| Orders | `/orders` | Заказы и доставка | [Orders.md](API_MODULES/Orders.md) |
| Payment | `/payment` & `/webhooks` | Платежи YooKassa | [Payment.md](API_MODULES/Payment.md) |
| Delivery | `/delivery` | Расчёт доставки (Почта России) | [Delivery.md](API_MODULES/Delivery.md) |
| Blog | `/blog` | Статьи блога | [Blog.md](API_MODULES/Blog.md) |
| Interactions | `/interactions` | Комментарии, лайки, просмотры | [Interactions.md](API_MODULES/Interactions.md) |

---

## Установка и запуск

### Требования

- Docker и Docker Compose
- Файл `.env` в корне проекта

### Переменные окружения

```env
# Database
DATABASE_URL=postgresql+asyncpg://app_user:app_password@db:5432/localtea
MIGRATION_DATABASE_URL=postgresql+asyncpg://migration_user:migration_password@db:5432/localtea

# Security
SECRET_KEY=your_super_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CSRF_ENABLED=False

# Redis
REDIS_URL=redis://redis:6379/0

# Email (SMTP)
SMTP_SERVER=smtp.example.com
SMTP_PORT=465
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
EMAILS_FROM_EMAIL=noreply@example.com
EMAILS_FROM_NAME=LocalTea

# Payment (ЮKassa)
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=test_secret_key
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
YOOKASSA_WEBHOOK_URL=https://api.localtea.ru/api/v1/webhooks/payment/yookassa

# Delivery
SENDER_POSTAL_CODE=111020

# Phone verification (SMS.ru)
SMS_RU_API_ID=your_api_id

# Uploads
UPLOADS_BASE_URL=https://api.localtea.ru
```

### Запуск

```bash
# Запуск всех сервисов
docker-compose up -d --build

# Применение миграций
docker-compose exec backend alembic upgrade head

# Просмотр логов
docker-compose logs -f backend
```

### Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| backend | 8000 | Клиентский API |
| admin_backend | 8001 | Админский API |
| worker | - | Celery worker |
| db | 5432 | PostgreSQL |
| redis | 6379 | Redis |

### Домены (Production)

| URL | Назначение |
|-----|------------|
| https://api.localtea.ru | Клиентский API |
| https://apiadmin.localtea.ru | Админский API |
| https://localtea.ru | Пользовательский фронтенд |
| https://admin.localtea.ru | Админский фронтенд |

---

## Безопасность

### Аутентификация

- **JWT Access Token**: Срок жизни 30 минут. Передаётся в заголовке `Authorization: Bearer <token>`.
- **Refresh Token**: UUID, хранится в httpOnly cookie. Срок жизни 7 дней.
- **CSRF Token**: Генерируется при логине, проверяется для мутирующих операций.

### Rate Limiting

Ограничение частоты запросов через `slowapi` + Redis:

| Endpoint | Лимит |
|----------|-------|
| `/user/login` | 3/мин, 20/час |
| `/user/registration` | 5/мин, 20/час |
| `/user/refresh` | 2/мин |
| `/user/phone-verification/start` | 3/мин, 10/час |
| `/interactions/comments` | 5/мин |
| `/interactions/likes` | 10/мин |
| `/interactions/views` | 20/мин |

### Хеширование

- **Пароли**: Argon2 (passlib).
- **Refresh токены**: SHA256 (хранятся только хеши).

### Разделение прав БД

- `app_user` — SELECT, INSERT, UPDATE, DELETE (для приложения).
- `migration_user` — CREATE, DROP, ALTER (для миграций).

---

## Кэширование (Redis)

1. **Rate Limiting** — Счётчики запросов.
2. **Cache Aside** — Кэширование товаров, статей.
3. **Счётчики** — Лайки, просмотры (атомарные операции).
4. **Write-Behind** — Отложенная запись просмотров в БД.

---

## Celery задачи

- Отправка email (подтверждение регистрации, смена email).
- Проверка статуса верификации телефона.
- Синхронизация счётчиков просмотров.

---

## Связанная документация

- [DATABASE.md](DATABASE.md) — Схема базы данных
- [SECURITY.md](SECURITY.md) — Безопасность
- [EMAIL.md](EMAIL.md) — Отправка email
- [REDIS_AND_CELERY.md](REDIS_AND_CELERY.md) — Кэширование и очереди
- [TESTING.md](TESTING.md) — Тестирование
- [STRESS_TESTING.md](STRESS_TESTING.md) — Нагрузочное тестирование
