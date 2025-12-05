# База Данных в LocalTea

В этом документе описана структура и конфигурация базы данных проекта.

## Общая информация

*   **СУБД**: PostgreSQL.
*   **Драйвер**: `asyncpg` (асинхронный драйвер для высокой производительности).
*   **ORM**: SQLAlchemy (в асинхронном режиме).
*   **Миграции**: Используется **Alembic**. Автоматическое создание таблиц через `Base.metadata.create_all` отключено.

## Подключение

Строка подключения задается в переменных окружения:
*   `DATABASE_URL`: Используется приложением (`app_user`).
*   `MIGRATION_DATABASE_URL`: Используется Alembic для миграций (`migration_user`). Если не задана, используется `DATABASE_URL`.

Пример формата: `postgresql+asyncpg://user:password@host:port/dbname`.

## Пользователи и Права

В проекте используется разделение прав доступа к БД (скрипт инициализации `docker/postgres/init.sql`):

1.  **`migration_user`**:
    *   Владелец схемы.
    *   Права: `ALL PRIVILEGES` (CREATE, DROP, ALTER tables).
    *   Используется только при деплое/миграциях.

2.  **`app_user`**:
    *   Пользователь приложения.
    *   Права: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
    *   **Запрещено**: `DROP`, `TRUNCATE`, `ALTER`.

## Управление миграциями (Alembic)

Для изменения схемы базы данных используются миграции.

### Основные команды

1.  **Создание новой миграции** (после изменения моделей в коде):
    ```bash
    docker-compose exec backend alembic revision --autogenerate -m "Описание изменений"
    ```
    Это создаст новый файл миграции в папке `alembic/versions/`.

2.  **Применение миграций** (обновление БД до актуального состояния):
    ```bash
    docker-compose exec backend alembic upgrade head
    ```

3.  **Откат миграции** (на один шаг назад):
    ```bash
    docker-compose exec backend alembic downgrade -1
    ```

## Схема Данных (Models)

На данный момент в проекте определены две основные сущности: `User` и `Token`.

### 1. Таблица `user` (Пользователи)
Хранит основную информацию о пользователях системы.

| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Уникальный идентификатор. |
| `email` | String (Unique) | Электронная почта (логин). |
| `username` | String (Unique) | Имя пользователя (альтернативный логин). |

### 2. Таблица `token` (Токены)
Хранит токены для сброса пароля и подтверждения email.

### 3. Модуль Каталога (`catalog`)

#### Таблица `category`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID категории. |
| `name` | String | Название. |
| `slug` | String (Unique) | URL-friendly название. |
| `image` | String | URL изображения категории. |
| `parent_id` | Integer (FK) | Родительская категория (для дерева). |
| `is_active` | Boolean | Активность. |

#### Таблица `product`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID товара. |
| `title` | String | Название. |
| `slug` | String (Unique) | URL-friendly название. |
| `category_id` | Integer (FK) | Категория. |
| `brewing_guide` | JSONB | Инструкция по завариванию. |
| `views_count` | Integer | Количество просмотров. |
| `likes_count` | Integer | Количество лайков. |
| `comments_count` | Integer | Количество комментариев. |

#### Таблица `sku`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID вариации. |
| `product_id` | Integer (FK) | Товар. |
| `sku_code` | String (Unique) | Артикул. |
| `price_cents` | Integer | Цена в копейках. |
| `quantity` | Integer | Физический остаток на складе. |
| `reserved_quantity` | Integer | Зарезервированный остаток (в неоплаченных заказах). |

### 4. Модуль Корзины (`cart`)

#### Таблица `cart`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID корзины. |
| `user_id` | Integer (FK) | Пользователь (опционально). |
| `session_id` | String | ID сессии (для анонимов). |

#### Таблица `cartitem`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID позиции. |
| `cart_id` | Integer (FK) | Корзина. |
| `sku_id` | Integer (FK) | Товар. |
| `quantity` | Integer | Количество. |

### 5. Модуль Заказов (`order`)

#### Таблица `order`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID заказа. |
| `status` | Enum | Статус (`awaiting_payment`, `paid`, `cancelled`, `shipped`). |
| `total_amount_cents` | Integer | Сумма заказа. |
| `shipping_address` | JSONB | Адрес доставки. |
| `contact_info` | JSONB | Контакты. |
| `expires_at` | DateTime | Время истечения брони (30 мин). |

#### Таблица `orderitem`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID позиции. |
| `order_id` | Integer (FK) | Заказ. |
| `sku_id` | Integer (FK) | Товар. |
| `price_cents` | Integer | Цена на момент покупки. |
| `quantity` | Integer | Количество. |

#### Таблица `payment`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID платежа. |
| `order_id` | Integer (FK) | Заказ. |
| `external_id` | String | ID в платежной системе (ЮKassa). |
| `status` | Enum | Статус платежа (`pending`, `succeeded`, `failed`). |
| `provider_response` | JSONB | Полный ответ от провайдера. |

| `hashed_password` | String | Хеш пароля (Argon2). |
| `is_active` | Boolean | Активен ли пользователь (по умолчанию `True`). |
| `is_superuser` | Boolean | Права администратора. |
| `is_email_confirmed` | Boolean | Подтвержден ли email. |
| `email_confirm_token` | String | Токен для подтверждения почты. |
| `firstname`, `lastname` | String | Имя, Фамилия. |
| `middlename` | String | Отчество. |
| `birthdate` | Date | Дата рождения. |
| `address` | String | Адрес доставки. |
| `avatar_url` | String | Ссылка на аватар. |
| `created_at` | DateTime | Дата регистрации (UTC). |
| `updated_at` | DateTime | Дата последнего обновления профиля (UTC). |

### 2. Таблица `token` (Сессии)
Хранит информацию о выданных Refresh токенах для управления сессиями.

| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | Уникальный идентификатор записи. |
| `user_id` | Integer (FK) | Ссылка на пользователя (`user.id`). |
| `refresh_token` | String (Unique) | **SHA256 хеш** токена обновления. |
| `csrf_token` | String | Связанный CSRF токен. |
| `ip` | String | IP-адрес, с которого был выполнен вход. |
| `user_agent` | String | User-Agent браузера/клиента. |
| `fingerprint` | String | Дополнительный отпечаток (зарезервировано). |
| `created_at` | DateTime | Дата создания сессии (UTC). |
| `expires_at` | DateTime | Дата истечения срока действия. |
| `revoked` | Boolean | Отозван ли токен (Logout). |
| `rotated_at` | DateTime | Дата ротации (если использовалась). |

## Связи (Relationships)

*   **User -> Token**: Один ко многим (`One-to-Many`). Один пользователь может иметь множество активных сессий (токенов) на разных устройствах.
*   При удалении пользователя (`cascade="all, delete-orphan"`) все его токены автоматически удаляются.

### 3. Модуль Блога (`blog`)

#### Таблица `article`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID статьи. |
| `title` | String | Заголовок. |
| `slug` | String (Unique) | URL-friendly название. |
| `content` | Text | Содержимое статьи (HTML/Markdown). |
| `preview_image` | String | Ссылка на изображение превью. |
| `is_published` | Boolean | Статус публикации. |
| `created_at` | Timestamp | Дата создания. |
| `updated_at` | Timestamp | Дата последнего обновления. |
| `author_id` | Integer (FK) | Автор статьи (User). |
| `views_count` | Integer | Количество просмотров. |
| `likes_count` | Integer | Количество лайков. |
| `comments_count` | Integer | Количество комментариев. |

### 4. Модуль Взаимодействий (`interactions`)

#### Таблица `comment`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID комментария. |
| `user_id` | Integer (FK) | Автор комментария. |
| `content` | Text | Текст комментария. |
| `created_at` | Timestamp | Дата создания. |
| `updated_at` | Timestamp | Дата обновления. |
| `article_id` | Integer (FK) | Ссылка на статью (nullable). |
| `product_id` | Integer (FK) | Ссылка на товар (nullable). |
| `likes_count` | Integer | Количество лайков на комментарии. |

#### Таблица `like`
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `user_id` | Integer (FK) | Пользователь (nullable, если аноним). |
| `fingerprint` | String | Хеш (IP + User-Agent) для анонимов. |
| `article_id` | Integer (FK) | Ссылка на статью (nullable). |
| `product_id` | Integer (FK) | Ссылка на товар (nullable). |
| `comment_id` | Integer (FK) | Ссылка на комментарий (nullable). |
| `created_at` | Timestamp | Дата лайка. |
| **Constraint** | Unique | `(user_id, target_id)` OR `(fingerprint, target_id)` - один лайк на объект. |

#### Таблица `view` (Опционально/Логи)
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID записи. |
| `fingerprint` | String | Хеш (IP + User-Agent) для анонимов. |
| `user_id` | Integer (FK) | Пользователь (если авторизован). |
| `article_id` | Integer (FK) | Статья. |
| `product_id` | Integer (FK) | Товар. |
| `created_at` | Timestamp | Время просмотра. |

#### Таблица `report` (Жалобы)
| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `id` | Integer (PK) | ID жалобы. |
| `user_id` | Integer (FK) | Кто пожаловался. |
| `comment_id` | Integer (FK) | На какой комментарий. |
| `reason` | String | Причина. |
| `created_at` | Timestamp | Дата создания. |
| `status` | String | Статус (new, resolved, rejected). |
