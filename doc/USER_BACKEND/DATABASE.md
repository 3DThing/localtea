# База данных в LocalTea (User Backend)

Документ актуализирован по фактической схеме PostgreSQL (таблицы/колонки создаются Alembic-миграциями в `alembic/versions`).

## Общая информация

- **СУБД**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.x (async)
- **Драйвер**: `asyncpg`
- **Миграции**: Alembic (автосоздание таблиц через `Base.metadata.create_all` отключено)

## Подключение

Используются переменные окружения:

- `DATABASE_URL` — основное подключение приложения
- `MIGRATION_DATABASE_URL` — подключение для миграций (если не задано, используется `DATABASE_URL`)

Формат: `postgresql+asyncpg://user:password@host:port/dbname`

## Пользователи БД и права

Используется принцип наименьших привилегий (см. `docker/postgres/init.sql`):

- `migration_user` — DDL (создание/изменение схемы), используется Alembic
- `app_user` — DML (SELECT/INSERT/UPDATE/DELETE), используется приложением

## Управление миграциями (Alembic)

Основные команды (в Docker окружении):

```bash
docker-compose exec backend alembic revision --autogenerate -m "описание"
docker-compose exec backend alembic upgrade head
docker-compose exec backend alembic downgrade -1
```

## Схема данных (актуальная, укрупнённо)

Ниже приведён укрупнённый обзор таблиц, сгруппированный по модулям. Полный перечень полей следует смотреть в моделях `backend/models/*.py` и миграциях.

### 1) Пользователи и сессии

#### Таблица `user`

Ключевые поля:

- `email` — уникальный логин
- `username` — уникальный логин
- `hashed_password` — хеш (Argon2)
- `is_email_confirmed`, `email_confirm_token`, `email_confirm_expires_at`, `email_confirmed_at`, `new_email_pending`
- Профиль: `firstname`, `lastname`, `middlename`, `birthdate`, `address`, `postal_code`, `avatar_url`
- Телефон: `phone_number`, `is_phone_confirmed`, `phone_verification_check_id`, `phone_verification_expires_at`
- Служебные: `created_at`, `updated_at`

Ограничения и индексы:

- `email` — unique
- `username` — unique
- `phone_number` — **unique (если заполнен)**: в БД поддерживается уникальным индексом `uq_user_phone_number`

#### Таблица `token`

Сессии и refresh-токены:

- `refresh_token` — хранится **в виде SHA256-хеша**
- `csrf_token`
- `ip`, `user_agent`, `fingerprint`
- `expires_at`, `revoked`, `rotated_at`

### 2) Каталог

#### Таблица `category`

- `name`, `slug` (unique), `parent_id` (дерево)
- `description`, `image`, `is_active`
- SEO: `seo_title`, `seo_description`

#### Таблица `product`

- `title`, `slug` (unique), `category_id`
- `tea_type`, `description`, `lore_description`, `brewing_guide` (JSONB)
- SEO: `seo_title`, `seo_description`, `seo_keywords`
- Счётчики: `views_count`, `likes_count`, `comments_count`
- `is_active`, `created_at`

#### Таблица `sku`

- `sku_code` (unique), `weight` (граммы)
- `price_cents`, `discount_cents`
- Остатки: `quantity`, `reserved_quantity`
- Флаги: `is_active`, `is_visible`, `is_limited`

#### Таблица `productimage`

- `product_id`, `url`, `is_main`, `sort_order`

### 3) Корзина

#### Таблицы `cart`, `cartitem`

- Корзина поддерживает владельца: `user_id` (авториз.) или `session_id` (гость)
- `cartitem`: `sku_id`, `quantity`, `fixed_price_cents`, `created_at`, `updated_at`

### 4) Заказы и платежи

#### Таблица `order`

- Статусы: `awaiting_payment`, `paid`, `processing`, `ready_for_pickup`, `shipped`, `delivered`, `cancelled`
- Суммы: `total_amount_cents`, `delivery_cost_cents`, `discount_amount_cents`
- Промо: `promo_code`
- Доставка: `delivery_method` (pickup / russian_post), `shipping_address` (JSONB), `tracking_number`
- Контакты: `contact_info` (JSONB)
- `created_at`, `expires_at`

#### Таблицы `orderitem`, `payment`

- `orderitem`: `sku_id`, `title`, `sku_info`, `price_cents`, `quantity`
- `payment`: `order_id`, `external_id`, `amount_cents`, `status` (pending/succeeded/failed), `provider_response` (JSONB)

### 5) Блог и взаимодействия

#### Таблицы `article`, `comment`, `like`, `view`, `report`

- `article`: публикации, счётчики, `author_id`
- `comment`: комментарии к статьям/товарам
- `like`: лайки (поддержка `user_id` или `fingerprint`), уникальность обеспечивается ограничениями в БД
- `view`: просмотры
- `report`: жалобы на комментарии

## Примечание про актуальность

Если содержимое этого документа расходится со схемой в БД, источником истины считается набор миграций в `alembic/versions` и фактическая схема PostgreSQL.
