# Документация проекта LocalTea

## Обзор
LocalTea — это современное веб-приложение для электронной коммерции (магазин чая), построенное на микросервисной архитектуре (или модульном монолите) с использованием Python и FastAPI.

## Документация

*   **User Backend**: [USER_BACKEND/README.md](doc/USER_BACKEND/README.md)
*   **Admin Backend**: [ADMIN_BACKEND/README.md](../ADMIN_BACKEND/README.md) (Новый модуль для управления магазином)

## Технологический стек

### Бэкенд
*   **Язык программирования**: Python 3.10+
*   **Веб-фреймворк**: FastAPI (асинхронный)
*   **Сервер приложений**: Uvicorn / Gunicorn
*   **Валидация данных**: Pydantic v2

### База данных и Хранение
*   **Основная БД**: PostgreSQL
*   **ORM**: SQLAlchemy (с использованием асинхронного драйвера `asyncpg`)
*   **Миграции**: Управление схемой БД через **Alembic**.

### Инфраструктура и Тестирование
*   **Кэширование и Брокер сообщений**: Redis

### Асинхронные задачи
*   **Очередь задач**: Celery
*   **Брокер**: Redis

### Безопасность
*   **Аутентификация**: JWT (JSON Web Tokens) - Access и Refresh токены.
*   **Хеширование паролей**: Argon2 (через библиотеку `passlib`).
*   **Защита**: CSRF токены, Rate Limiting (ограничение частоты запросов через `slowapi` и Redis).
*   **Конфиденциальность**: Все секретные ключи и пароли вынесены в файл `.env` (не включен в репозиторий).
*   **Инфраструктура**: Разделение прав доступа к БД (`app_user` vs `migration_user`), запуск контейнеров от непривилегированного пользователя (Non-root).

### Инфраструктура и Тестирование
*   **Контейнеризация**: Docker, Docker Compose
*   **Тестирование**: Pytest, Pytest-Asyncio.
*   **Нагрузочное тестирование**: Скрипты для стресс-тестов. Подробнее в [STRESS_TESTING.md](STRESS_TESTING.md).
*   **Email**: Отправка писем через SMTP с использованием HTML-шаблонов (Jinja2). Подробнее в [EMAIL.md](EMAIL.md).

## Архитектура приложения

Проект следует слоистой архитектуре, разделяя ответственность между различными модулями:

### Структура директорий (`backend/`)

*   **`api/`**: Слой представления (Presentation Layer). Содержит маршруты (endpoints) API, сгруппированные по версиям (v1) и сущностям (user, shop, order, admin, blog, interactions). Отвечает за прием HTTP-запросов и возврат ответов.
*   **`core/`**: Ядро приложения. Содержит глобальные настройки (`config.py`), настройки безопасности (`security.py`), логирование (`logger.py`) и конфигурацию лимитера (`limiter.py`).
*   **`crud/`**: Слой доступа к данным (Data Access Layer). Содержит функции для создания, чтения, обновления и удаления записей в БД. Изолирует логику работы с БД от бизнес-логики.
*   **`db/`**: Конфигурация базы данных. Инициализация сессий (`session.py`) и базовые классы моделей.
*   **`dependencies/`**: Зависимости FastAPI (Dependency Injection). Включает получение сессии БД, получение текущего пользователя, проверку прав доступа.
*   **`models/`**: ORM модели SQLAlchemy. Отражают структуру таблиц в базе данных (`user.py`, `token.py`).
*   **`schemas/`**: Pydantic схемы (DTO). Используются для валидации входных данных и сериализации ответов API.
*   **`services/`**: Слой бизнес-логики (Service Layer). Содержит сложную логику приложения, которая не относится ни к CRUD, ни к API (например, регистрация пользователя с отправкой email, смена пароля).
*   **`templates/`**: HTML-шаблоны для писем (Jinja2).
*   **`utils/`**: Вспомогательные утилиты (например, модуль отправки почты `email.py`).
*   **`worker.py`**: Конфигурация и задачи Celery для фоновой обработки (например, отправка email).

### Кэширование и Производительность (Redis)

Проект использует Redis не только как брокер сообщений, но и для кэширования:
1.  **Rate Limiting**: Ограничение частоты запросов (через `slowapi`) для защиты от спама и DDoS.
2.  **Cache Aside**: Кэширование "тяжелого" контента (статьи, товары) с долгим TTL.
3.  **Счетчики**: Хранение динамических счетчиков (лайки, просмотры) отдельно от основного контента для атомарного обновления.
4.  **Write-Behind**: Отложенная запись просмотров в БД для снижения нагрузки на диск.

## Установка и Запуск

### Предварительные требования
*   Docker и Docker Compose

### Настройка окружения
1.  Создайте файл `.env` в корне проекта.
2.  Заполните его необходимыми переменными (пример см. ниже).

**Пример `.env`:**
```ini
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=localtea

# App Connection (Limited Rights: SELECT, INSERT, UPDATE, DELETE)
DATABASE_URL=postgresql+asyncpg://app_user:app_password@db:5432/localtea

# Migration Connection (Full Rights: CREATE, DROP, ALTER)
MIGRATION_DATABASE_URL=postgresql+asyncpg://migration_user:migration_password@db:5432/localtea

# Security
SECRET_KEY=your_super_secret_key_change_this
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (SMTP)
SMTP_SERVER=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=your_email@yandex.ru
SMTP_PASSWORD=your_app_password
EMAILS_FROM_EMAIL=your_email@yandex.ru
EMAILS_FROM_NAME=LocalTea
```

### Запуск
```bash
docker-compose up -d --build
```
Это запустит контейнеры:
*   `backend`: Основное API (порт 8000)
*   `admin_backend`: Админское API (порт 8001)
*   `admin_frontend`: Фронтенд админки (порт 3001)
*   `worker`: Обработчик фоновых задач (Celery)
*   `db`: PostgreSQL (порт 5432)
*   `redis`: Redis (порт 6379)

### Домены (Production)
*   `https://api.localtea.ru` — Клиентский API (публичный доступ)
*   `https://apiadmin.localtea.ru` — Админский API (ограничен по IP)
*   `https://admin.localtea.ru` — Фронтенд админки (ограничен по IP)

### Миграции
Для управления структурой базы данных используется Alembic.
При первом запуске необходимо применить миграции:

```bash
docker-compose exec backend alembic upgrade head
```

## Основные потоки данных

1.  **Запрос**: HTTP запрос поступает на endpoint в `api/`.
2.  **Валидация**: Данные проверяются с помощью схем из `schemas/`.
3.  **Зависимости**: `dependencies/` предоставляют сессию БД и текущего пользователя (если требуется).
4.  **Логика**: Контроллер вызывает методы из `services/` (для бизнес-логики) или напрямую `crud/` (для простых операций).
5.  **Данные**: `crud/` взаимодействует с БД через модели `models/`.
6.  **Ответ**: Результат преобразуется в Pydantic схему и возвращается клиенту.

## Безопасность

*   Используется схема OAuth2 с Bearer токенами.
*   **Access Token**: Короткоживущий токен для доступа к API.
*   **Refresh Token**: Долгоживущий токен для обновления Access токена, хранится в HttpOnly cookie.
*   **CSRF Protection**: Для мутирующих операций (POST, PUT, DELETE) требуется валидный CSRF токен в заголовках (если включено в настройках `CSRF_ENABLED`).
