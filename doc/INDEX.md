# LocalTea — Полная документация

## 📚 Структура документации

### Frontend документация

#### Пользовательское приложение (USER_FRONTEND)

- **[README.md](doc/USER_FRONTEND/README.md)** — Главная документация
  - Архитектура приложения
  - Технологический стек
  - Структура проекта
  - Страницы приложения
  - Конфигурация и развёртывание

- **[COMPONENTS.md](doc/USER_FRONTEND/COMPONENTS.md)** — Компоненты
  - Структура компонентов
  - Layout компоненты (Header, Footer)
  - Компоненты каталога
  - Компоненты блога
  - Стилизация и тема Mantine

- **[STATE_MANAGEMENT.md](doc/USER_FRONTEND/STATE_MANAGEMENT.md)** — Управление состоянием
  - Zustand stores (auth, cart, favorites)
  - Состояние и actions
  - Селекторы для оптимизации
  - Middleware (devtools, persist)
  - Тестирование stores

- **[API_REFERENCE.md](doc/USER_FRONTEND/API_REFERENCE.md)** — API клиент
  - Конфигурация axios
  - Endpoints справочник
  - Обработка ошибок
  - Authentification

- **[PAYMENT.md](doc/USER_FRONTEND/PAYMENT.md)** — Платёжная система
  - Поток платежа YooKassa
  - Страница успешной оплаты
  - Кнопка оплаты в профиле
  - API endpoints платежей
  - Тестовые карты и безопасность

---

### Backend документация

#### Пользовательское API (USER_BACKEND)

- **[README.md](doc/USER_BACKEND/README.md)** — Главная документация
  - Технологический стек
  - Архитектура приложения
  - Слои приложения (API, Service, CRUD, Domain)
  - API модули
  - Установка и запуск
  - Безопасность
  - Кэширование (Redis)
  - Celery задачи

#### API Модули

- **[Users.md](doc/USER_BACKEND/API_MODULES/Users.md)** — Пользователи и аутентификация
  - Регистрация и вход
  - JWT токены
  - Верификация телефона (звонок)
  - Профиль пользователя
  - Удаление аккаунта

- **[Catalog.md](doc/USER_BACKEND/API_MODULES/Catalog.md)** — Каталог товаров
  - Категории
  - Товары (Product)
  - Фасовки (SKU)
  - Фильтрация и поиск
  - Изображения товаров

- **[Cart.md](doc/USER_BACKEND/API_MODULES/Cart.md)** — Корзина
  - Гостевая корзина
  - Добавление товаров
  - Обновление количества
  - Мёрж корзины при авторизации

- **[Orders.md](doc/USER_BACKEND/API_MODULES/Orders.md)** — Заказы
  - Создание заказа (checkout)
  - Статусы заказов
  - История заказов
  - Информация о доставке
  - Трекинг номер

- **[Payment.md](doc/USER_BACKEND/API_MODULES/Payment.md)** — Платежи YooKassa
  - Сервис YooKassa (create, get payment)
  - Создание и проверка платежей
  - Webhook обработка
  - Автоматическое обновление статусов
  - Обработка ошибок

- **[Delivery.md](doc/USER_BACKEND/API_MODULES/Delivery.md)** — Доставка
  - Расчёт стоимости доставки
  - API Почты России
  - Методы доставки (самовывоз, почта)
  - Кэширование тарифов

- **[Blog.md](doc/USER_BACKEND/API_MODULES/Blog.md)** — Блог
  - Статьи блога
  - Поиск и фильтрация
  - Управление черновиками

- **[Interactions.md](doc/USER_BACKEND/API_MODULES/Interactions.md)** — Взаимодействия
  - Комментарии
  - Лайки товаров
  - Просмотры (аналитика)

---

### Интеграции

- **[PAYMENT_INTEGRATION.md](doc/PAYMENT_INTEGRATION.md)** — Полный гайд платежей
  - Быстрый старт
  - Архитектура платежей
  - Статусы платежей
  - API endpoints
  - Тестовые карты
  - Безопасность
  - Production checklist

- **[DELIVERY_INTEGRATION.md](doc/DELIVERY_INTEGRATION.md)** — Интеграция доставки
  - Расчёт стоимости доставки
  - API Почты России
  - Кэширование тарифов

---

### Админский интерфейс

#### Админское приложение (ADMIN_FRONTEND)

- **[README.md](doc/ADMIN_FRONTEND/README.md)** — Главная документация

#### Админское API (ADMIN_BACKEND)

- **[README.md](doc/ADMIN_BACKEND/README.md)** — Главная документация

---

## 🚀 Быстрый старт

### Запуск локально

```bash
# 1. Клонировать репо
git clone https://github.com/3DThing/localtea.git
cd localtea

# 2. Запустить все сервисы
docker-compose up -d --build

# 3. Применить миграции
docker-compose exec backend alembic upgrade head

# 4. Доступ к приложению
# Frontend: http://localhost:3000
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Переменные окружения

Основные переменные в `.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/localtea

# Security
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Payment (YooKassa)
YOOKASSA_SHOP_ID=123456
YOOKASSA_API_KEY=live_xxxxx

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_USER=email@example.com
SMTP_PASSWORD=password
```

---

## 📋 Контрольный список документации

### Frontend ✅

- [x] Главная архитектура
- [x] Структура проекта
- [x] Компоненты
- [x] State Management (Zustand)
- [x] API интеграция
- [x] Платёжная система

### Backend ✅

- [x] Архитектура и слои
- [x] API модуль Users
- [x] API модуль Catalog
- [x] API модуль Cart
- [x] API модуль Orders
- [x] API модуль Payment
- [x] API модуль Delivery
- [x] API модуль Blog
- [x] API модуль Interactions
- [x] Платёжная система YooKassa
- [x] Интеграция доставки

### Админский интерфейс ⚙️

- [x] Frontend архитектура
- [x] Backend архитектура

---

## 🔗 Связанные ресурсы

### Официальная документация

- [Next.js 16 Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [YooKassa API](https://yookassa.ru/developers/api)
- [Mantine UI Docs](https://mantine.dev/)
- [Zustand Docs](https://zustand-demo.vercel.app/)

### GitHub

- [LocalTea Repository](https://github.com/3DThing/localtea)

---

## 📞 Поддержка

- **Email**: support@localtea.ru
- **GitHub Issues**: [Создать issue](https://github.com/3DThing/localtea/issues)
- **YooKassa Support**: https://yookassa.ru/support

---

## 📝 Заметки разработчика

### Основные технологии

- **Frontend**: Next.js 16, React 19, TypeScript, Mantine UI 7, Zustand
- **Backend**: FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Redis, Celery
- **Payments**: YooKassa (Яндекс)
- **Delivery**: Почта России API
- **Deployment**: Docker, Docker Compose, nginx

### Архитектурные принципы

1. **Async-first** — весь код в backend использует async/await
2. **Type-safe** — TypeScript на frontend, Pydantic на backend
3. **Microservices-ready** — разделение на frontend, backend, worker
4. **Secure** — JWT, CSRF, SSL, password hashing (Argon2)
5. **Scalable** — Redis для кэша и rate limiting, Celery для задач

---

**Последнее обновление:** 10 декабря 2025  
**Версия документации:** 2.0  
**Автор:** GitHub Copilot
