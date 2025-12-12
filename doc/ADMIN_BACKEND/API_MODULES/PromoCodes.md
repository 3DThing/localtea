# Модуль Promo Codes (Admin)

Управление промокодами магазина.
Базовый префикс для всех маршрутов: `/api/v1/promo-codes`.

## Маршруты

### `GET /`

*   **Описание**: Получить список промокодов.
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `skip` (int, default=0): Пропустить N записей.
    *   `limit` (int, default=50, max=200): Лимит записей.
    *   `is_active` (bool, optional): Фильтр по активности.
    *   `is_valid` (bool, optional): Фильтр по текущей валидности (проверяет даты и лимиты).
    *   `q` (string, optional): Поиск по коду и описанию.
*   **Ответ**: `PromoCodeListResponse` со списком промокодов.

### `GET /{promo_id}`

*   **Описание**: Получить промокод по ID.
*   **Требования**: Права администратора.
*   **Параметры**: `promo_id` (Integer).
*   **Ответ**: Объект `PromoCodeResponse`.

### `POST /`

*   **Описание**: Создать новый промокод.
*   **Требования**: Права администратора.
*   **Тело запроса**: `PromoCodeCreate`
    *   `code` (string, required): Уникальный код промокода.
    *   `description` (string, optional): Описание.
    *   `discount_type` (string, required): Тип скидки — `percentage` или `fixed`.
    *   `discount_value` (int, required): Размер скидки (% или копейки).
    *   `min_order_amount_cents` (int, optional): Минимальная сумма заказа.
    *   `max_discount_cents` (int, optional): Максимальная скидка в копейках.
    *   `usage_limit` (int, optional): Общий лимит использований.
    *   `usage_limit_per_user` (int, optional): Лимит на одного пользователя.
    *   `valid_from` (datetime, optional): Дата начала действия.
    *   `valid_until` (datetime, optional): Дата окончания действия.
    *   `is_active` (bool, default=true): Активен ли промокод.
*   **Ответ**: Созданный объект `PromoCodeResponse`.
*   **Ошибки**: `400` — Код уже существует.

### `PATCH /{promo_id}`

*   **Описание**: Обновить промокод.
*   **Требования**: Права администратора.
*   **Параметры**: `promo_id` (Integer).
*   **Тело запроса**: `PromoCodeUpdate` (все поля опциональны).
*   **Ответ**: Обновлённый объект `PromoCodeResponse`.

### `DELETE /{promo_id}`

*   **Описание**: Удалить промокод.
*   **Требования**: Права администратора.
*   **Параметры**: `promo_id` (Integer).
*   **Ответ**: `{"message": "Promo code deleted"}`.

### `POST /validate`

*   **Описание**: Проверить промокод и рассчитать скидку.
*   **Требования**: Права администратора.
*   **Тело запроса**: `PromoCodeValidate`
    *   `code` (string): Код промокода.
    *   `order_amount_cents` (int): Сумма заказа в копейках.
*   **Ответ**: `PromoCodeValidateResponse`
    *   `valid` (bool): Валиден ли промокод.
    *   `discount_cents` (int): Рассчитанная скидка.
    *   `message` (string, optional): Сообщение об ошибке.

### `POST /{promo_id}/toggle`

*   **Описание**: Переключить активность промокода.
*   **Требования**: Права администратора.
*   **Параметры**: `promo_id` (Integer).
*   **Ответ**: `{"is_active": bool}`.

---

## Типы скидок

| Тип | Описание | Пример |
|-----|----------|--------|
| `percentage` | Процент от суммы заказа | 10 = скидка 10% |
| `fixed` | Фиксированная сумма в копейках | 50000 = скидка 500₽ |

---

## Модель данных PromoCodeResponse

*   `id` (int): ID промокода.
*   `code` (string): Код промокода.
*   `description` (string, optional): Описание.
*   `discount_type` (string): Тип скидки.
*   `discount_value` (int): Размер скидки.
*   `min_order_amount_cents` (int, optional): Минимальная сумма заказа.
*   `max_discount_cents` (int, optional): Максимальная скидка.
*   `usage_limit` (int, optional): Общий лимит использований.
*   `usage_limit_per_user` (int, optional): Лимит на пользователя.
*   `valid_from` (datetime, optional): Дата начала.
*   `valid_until` (datetime, optional): Дата окончания.
*   `is_active` (bool): Активен ли.
*   `usage_count` (int): Количество использований.
*   `is_valid` (bool): Вычисляемое поле — валиден ли сейчас.
*   `created_at` (datetime): Дата создания.
*   `updated_at` (datetime, optional): Дата обновления.
