# AI_ASSISTANT — Документация

## Обзор

AI Assistant — микросервис чат-бота для интернет-магазина чая **LocalTea**. Консультирует по сортам чая, способам заваривания, хранению и другим вопросам. Использует OpenAI-совместимый API (Timeweb Cloud) с RAG-контекстом из базы знаний.

## Содержание

- [Технологический стек](#технологический-стек)
- [Архитектура](#архитектура)
- [API эндпоинты](#api-эндпоинты)
- [Установка и запуск](#установка-и-запуск)
- [Конфигурация](#конфигурация)
- [Модели базы данных](#модели-базы-данных)
- [Сервисы](#сервисы)
- [Фронтенд виджет](#фронтенд-виджет)
- [Админ-панель](#админ-панель)
- [RAG База знаний](#rag-база-знаний)
- [Безопасность](#безопасность)
- [Docker](#docker)

---

## Технологический стек

| Компонент | Технология | Версия |
|-----------|------------|--------|
| Язык | Python | 3.11 |
| Фреймворк | FastAPI | 0.100+ |
| ORM | SQLAlchemy | 2.0+ (async) |
| БД | PostgreSQL | 15+ (общая) |
| Драйвер БД | asyncpg | - |
| HTTP клиент | httpx | - |
| Валидация | Pydantic | 2.0+ |
| Сервер | Uvicorn | - |
| OpenAI API | Timeweb Cloud | - |
| Фронтенд | React 19 + Mantine 8 | CSS Modules |

---

## Архитектура

### Структура директорий

```
ai_assistant/
├── __init__.py
├── main.py                 # FastAPI приложение (порт 8004)
├── Dockerfile              # Docker-образ
├── requirements.txt        # Python-зависимости
├── seed_rag.py             # Скрипт заполнения RAG базы знаний
├── models/
│   ├── __init__.py
│   └── assistant.py        # SQLAlchemy модели (5 таблиц)
├── schemas.py              # Pydantic-схемы
├── services.py             # Бизнес-логика (5 сервисов)
└── api/
    ├── __init__.py
    ├── chat.py             # Пользовательские эндпоинты
    └── admin.py            # Админские эндпоинты
```

### Схема взаимодействия

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ user_frontend│────▶│ AI Assistant API  │────▶│ Timeweb Cloud    │
│ (ChatWidget) │     │ (port 8004)       │     │ (OpenAI API)     │
└──────────────┘     └────────┬─────────┘     └──────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   PostgreSQL 15    │
                    │ (общая БД localtea)│
                    └────────────────────┘
                              │
┌──────────────┐     ┌────────┴─────────┐
│admin_frontend│────▶│ AI Admin API     │
│ (Dashboard)  │     │ (тот же сервис)  │
└──────────────┘     └──────────────────┘
```

---

## API эндпоинты

### Пользовательские (`/api/v1/chat`)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/config` | Настройки виджета (цвета, тексты, статус) |
| `POST` | `/conversations` | Создать новый диалог |
| `POST` | `/conversations/{id}/messages` | Отправить сообщение |
| `GET` | `/conversations/{id}` | Получить диалог |
| `GET` | `/conversations/{id}/messages` | Получить новые сообщения (polling) |

### Админские (`/api/v1/admin/assistant`)

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/settings` | Получить все настройки |
| `PUT` | `/settings/{key}` | Обновить настройку |
| `PUT` | `/settings` | Обновить пакет настроек |
| `GET` | `/conversations` | Список диалогов (фильтр, поиск) |
| `GET` | `/conversations/{id}` | Детали диалога с сообщениями |
| `POST` | `/conversations/{id}/switch-to-manager` | Переключить на менеджера |
| `POST` | `/conversations/{id}/switch-to-ai` | Вернуть на AI |
| `POST` | `/conversations/{id}/close` | Закрыть диалог |
| `POST` | `/conversations/{id}/manager-message` | Отправить сообщение от менеджера |
| `GET` | `/rag` | Список RAG документов |
| `POST` | `/rag` | Добавить RAG документ |
| `PUT` | `/rag/{id}` | Обновить RAG документ |
| `DELETE` | `/rag/{id}` | Удалить RAG документ |
| `GET` | `/banned-phrases` | Список запрещённых фраз |
| `POST` | `/banned-phrases` | Добавить фразу |
| `PUT` | `/banned-phrases/{id}` | Обновить фразу |
| `DELETE` | `/banned-phrases/{id}` | Удалить фразу |
| `GET` | `/stats` | Статистика использования |

---

## Установка и запуск

### Через Docker (рекомендуется)

```bash
# Продакшн
docker compose -f docker-compose.prod.yml up -d ai_assistant

# Локальная разработка
docker compose -f docker-compose.local.yml up -d ai_assistant

# Пересборка
docker compose -f docker-compose.local.yml up -d --build ai_assistant
```

### Локально (для отладки)

```bash
# 1. Установить зависимости
pip install -r ai_assistant/requirements.txt

# 2. Применить миграцию
alembic upgrade head

# 3. Заполнить RAG базу знаний
python -m ai_assistant.seed_rag

# 4. Запустить сервис
uvicorn ai_assistant.main:app --host 0.0.0.0 --port 8004 --reload
```

### Swagger документация

После запуска доступна по адресу: `http://localhost:8004/docs`

---

## Конфигурация

Все настройки хранятся в таблице `ai_assistant_settings` и управляются через админ-панель.

### Настройки по умолчанию

| Ключ | По умолчанию | Описание |
|------|------------|----------|
| `is_enabled` | `true` | Включён ли ассистент |
| `api_url` | Timeweb Cloud URL | URL OpenAI API |
| `api_key` | JWT токен | Ключ API |
| `model_name` | `openai` | Название модели |
| `temperature` | `0.7` | Температура генерации |
| `max_tokens` | `1000` | Максимальная длина ответа |
| `system_prompt` | Чайный консультант | Системный промт |
| `context_messages_limit` | `10` | Лимит сообщений контекста |
| `manager_keywords` | `менеджер,оператор,...` | Ключевые слова для менеджера |
| `chat_primary_color` | `#d4894f` | Основной цвет виджета |
| `chat_bg_color` | `#1a1412` | Фон виджета |
| `chat_header_text` | `Чайный помощник` | Заголовок |
| `chat_placeholder` | `Задайте вопрос о чае...` | Placeholder |
| `chat_welcome_message` | Приветственное сообщение | Первое сообщение |
| `chat_position` | `bottom-right` | Позиция на экране |

### Переменные окружения

| Переменная | Описание | Контейнер |
|-----------|----------|-----------|
| `POSTGRES_HOST` | Хост БД | ai_assistant |
| `POSTGRES_PORT` | Порт БД | ai_assistant |
| `ENABLE_CORS` | Включить CORS | ai_assistant |
| `CORS_ORIGINS` | Разрешённые домены | ai_assistant |
| `AI_ASSISTANT_URL` | URL сервиса (для прокси) | user_frontend |
| `NEXT_PUBLIC_AI_ASSISTANT_URL` | URL для прямого доступа | user_frontend |
| `NEXT_PUBLIC_AI_API_URL` | URL админ API | admin_frontend |

---

## Модели базы данных

### ai_assistant_settings

Ключ-значение хранилище настроек.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer (PK) | ID |
| key | String (unique) | Ключ настройки |
| value | Text | Значение |
| updated_at | DateTime | Последнее обновление |

### ai_conversation

Диалоги с пользователями.

| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID (PK) | ID |
| user_id | Integer (FK → user) | ID авторизованного юзера (nullable) |
| session_id | String | ID сессии (для анонимов) |
| status | Enum | active / manager_requested / manager_connected / closed |
| manager_id | Integer (FK → user) | ID подключённого менеджера |
| created_at | DateTime | Создан |
| updated_at | DateTime | Обновлён |

### ai_message

Сообщения в диалогах.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer (PK) | ID |
| conversation_id | UUID (FK) | ID диалога |
| role | Enum | user / assistant / manager / system |
| content | Text | Текст сообщения |
| tokens_used | Integer | Использовано токенов |
| response_time_ms | Integer | Время ответа (мс) |
| was_filtered | Boolean | Было ли отфильтровано |
| created_at | DateTime | Создано |

### ai_rag_document

Документы базы знаний RAG.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer (PK) | ID |
| title | String | Название |
| content | Text | Содержимое |
| category | String | Категория |
| keywords | Text | Ключевые слова (через запятую) |
| is_active | Boolean | Активен ли |
| created_at | DateTime | Создан |

### ai_banned_phrase

Запрещённые слова и фразы.

| Поле | Тип | Описание |
|------|-----|----------|
| id | Integer (PK) | ID |
| phrase | String | Фраза |
| apply_to_input | Boolean | Фильтр ввода юзера |
| apply_to_output | Boolean | Фильтр ответов AI |
| action | String | block / replace |
| replacement | String | Текст замены |
| is_active | Boolean | Активна ли |

---

## Сервисы

### SettingsService

Управление настройками (CRUD, загрузка по умолчанию, конвертация типов).

### ContentFilter

Фильтрация контента:
- `check_input()` — проверяет ввод пользователя на запрещённые фразы, возвращает ошибку при совпадении
- `filter_output()` — заменяет запрещённые фразы в ответе AI

### RAGService

Поиск релевантных документов по ключевым словам из сообщения пользователя. Возвращает контекст для системного промта.

### OpenAIClient

HTTP-клиент для OpenAI-совместимого API (Timeweb Cloud):
- Отправка chat completion запросов
- Подсчёт использованных токенов
- Обработка ошибок и таймаутов

### ChatService

Оркестратор, объединяющий все сервисы:

1. Проверка включённости ассистента
2. Фильтрация ввода (ContentFilter)
3. Обнаружение ключевых слов для менеджера
4. Получение RAG-контекста
5. Формирование системного промта + контекст сообщений
6. Вызов OpenAI API
7. Фильтрация ответа
8. Сохранение в БД

---

## Фронтенд виджет

### Файлы

```
user_frontend/src/
├── components/ChatWidget/
│   ├── ChatWidget.tsx       # Компонент виджета
│   ├── ChatWidget.module.css # Стили (CSS Modules)
│   └── index.ts             # Реэкспорт
└── app/
    ├── layout.tsx           # Интеграция виджета
    └── api/v1/ai/
        └── [...path]/
            └── route.ts     # Прокси на AI микросервис
```

### Функциональность

- **Плавающая кнопка** на всех страницах (правый нижний угол)
- **Окно чата** с анимацией открытия/закрытия
- **Адаптивный дизайн** — на мобильных занимает весь экран
- **Тема** — тёмный стиль с amber/gold акцентами (чайная тема)
- **Persistence** — ID диалога и сессии сохраняются в `localStorage`
- **Polling** — опрос новых сообщений в режиме менеджера (каждые 3 сек)
- **Индикатор печати** — анимированные точки при ожидании ответа
- **Статус** — отображение «AI-ассистент» или «Вас консультирует менеджер»
- **Анонимный доступ** — работает без авторизации через `X-Session-ID`

### Стилизация

Виджет использует CSS Modules с переменными, соответствующими теме сайта:
- Фон: `#1a1412` (тёмное дерево)
- Акценты: `#d4894f` (чайное золото)
- Шрифт заголовка: Georgia, serif
- Скругления: 12px–16px

---

## Админ-панель

### Расположение

```
admin_frontend/src/app/dashboard/ai-assistant/
├── page.tsx                          # Главная страница с табами
└── components/
    ├── ConversationsTab.tsx          # Переписки (список + детали)
    ├── SettingsTab.tsx               # Общие настройки
    ├── ModelSettingsTab.tsx          # Параметры модели
    ├── RAGTab.tsx                    # База знаний (CRUD)
    ├── BannedPhrasesTab.tsx          # Запрещённые фразы
    ├── StatsTab.tsx                  # Статистика
    └── DesignTab.tsx                 # Оформление виджета
```

### Вкладки

| # | Вкладка | Функции |
|---|---------|---------|
| 1 | **Переписки** | Список диалогов, фильтр по статусу, поиск, детализация, переключение AI↔менеджер, отправка сообщений от менеджера, закрытие |
| 2 | **Общие настройки** | Включение/отключение, системный промт, ключевые слова для менеджера |
| 3 | **Модель** | API URL, API ключ, название модели, температура, max_tokens, лимит контекста |
| 4 | **База знаний (RAG)** | CRUD документов, категории, ключевые слова, включение/отключение |
| 5 | **Безопасность** | Запрещённые фразы (блокировка/замена), фильтрация входа/выхода |
| 6 | **Дизайн** | Цвета, тексты, позиция, custom CSS, предпросмотр |
| 7 | **Статистика** | Общее количество, активные, сообщения, ср. время, токены, за сегодня, эскалации |

### Доступ

Все admin-эндпоинты требуют JWT токен с `is_superuser=True`. В admin_frontend используется общий механизм авторизации через `adminAxios` (автоматический refresh токенов).

---

## RAG База знаний

### Предзаполненные документы (seed_rag.py)

| # | Название | Категория |
|---|---------|-----------|
| 1 | Основные виды чая | tea_types |
| 2 | Заваривание чёрного чая | brewing |
| 3 | Заваривание зелёного чая | brewing |
| 4 | Заваривание пуэра | brewing |
| 5 | Заваривание белого чая | brewing |
| 6 | Хранение чая | storage |
| 7 | Польза чая для здоровья | health |
| 8 | О нашем магазине | store_info |
| 9 | Чай в подарок | gifts |
| 10 | Аксессуары для чаепития | accessories |

### Запуск seed-скрипта

```bash
# Внутри контейнера
python -m ai_assistant.seed_rag

# Через docker exec
docker compose exec ai_assistant python -m ai_assistant.seed_rag
```

---

## Безопасность

### Аутентификация

- **Пользователи**: опциональная JWT авторизация + fallback на `X-Session-ID`
- **Администраторы**: обязательная JWT авторизация с проверкой `is_superuser`
- **Прокси**: Next.js API route проксирует запросы к микросервису, скрывая его от прямого доступа

### Фильтрация контента

- Проверка входящих сообщений на запрещённые фразы
- Проверка ответов AI перед отправкой клиенту
- Действия: блокировка сообщения целиком или замена текста

### Защита данных

- Все данные хранятся в PostgreSQL с параметризованными запросами (SQLAlchemy)
- Логирование без чувствительных данных
- CORS настраивается для конкретных доменов
- API ключ OpenAI хранится в БД (доступ только через админ API)

---

## Docker

### Порт

Микросервис работает на порту **8004**.

> ⚠️ Порт 8003 занят pgAdmin. AI Assistant использует 8004.

### Контейнер

```yaml
ai_assistant:
  build:
    context: .
    dockerfile: ai_assistant/Dockerfile
  ports:
    - "127.0.0.1:8004:8004"
  env_file:
    - .env
  depends_on:
    - db
    - redis
```

### Связанные сервисы

| Сервис | Зависимость | Описание |
|--------|------------|----------|
| db | Прямая | PostgreSQL (общая БД) |
| redis | Непрямая | Через shared backend код |
| user_frontend | Обратная | Прокси через Next.js API route |
| admin_frontend | Обратная | Прямые HTTP запросы |

---

## Миграция БД

```bash
# Применить миграцию
alembic upgrade head

# Откатить миграцию
alembic downgrade -1

# Проверить текущую ревизию
alembic current
```

Файл миграции: `alembic/versions/20260227_add_ai_assistant_tables.py`

Создаёт 5 таблиц и 2 enum типа:
- Таблицы: `ai_assistant_settings`, `ai_conversation`, `ai_message`, `ai_rag_document`, `ai_banned_phrase`
- Enum: `ai_conversation_status`, `ai_message_role`

---

## Связанная документация

- [USER_BACKEND](../USER_BACKEND/README.md) — основной backend API
- [USER_FRONTEND](../USER_FRONTEND/README.md) — пользовательский фронтенд
- [ADMIN_BACKEND](../ADMIN_BACKEND/README.md) — админ backend
- [ADMIN_FRONTEND](../ADMIN_FRONTEND/README.md) — админ фронтенд
- [DATABASE](../USER_BACKEND/DATABASE.md) — схема базы данных
