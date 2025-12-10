# API Маршруты (Endpoints) модуля Orders

В этом документе описаны маршруты API для оформления заказов и обработки платежей.
Базовый префикс для всех маршрутов: `/api/v1/orders`.

## Управление заказами

### `POST /checkout`

**Описание**: Оформление заказа из текущей корзины.

**Требования**: Аутентификация или session_id.

**Тело запроса** (`OrderCheckout`):
```json
{
  "delivery_method": "pickup" | "russian_post",
  "contact_info": {
    "firstname": "string",
    "lastname": "string",
    "middlename": "string" | null,
    "phone": "string",
    "email": "string"
  },
  "shipping_address": {              // Только для russian_post
    "postal_code": "string (6 цифр)",
    "address": "string"
  },
  "delivery_cost_cents": 0,          // Стоимость доставки в копейках
  "payment_method": "card"           // По умолчанию "card"
}
```

**Действия**:
1. Проверяет наличие товаров в корзине.
2. Проверяет наличие товаров на складе.
3. Атомарно резервирует товары (уменьшает `quantity`, увеличивает `reserved_quantity` в `SKU`).
4. Создает заказ (`Order`) со статусом `AWAITING_PAYMENT`.
5. Создает позиции заказа (`OrderItem`).
6. Очищает корзину.
7. Инициирует платеж через ЮKassa.
8. Создаёт запись `Payment` с `external_id` и `payment_url`.

**Ответ** (`OrderResponse`):
```json
{
  "id": 1,
  "status": "awaiting_payment",
  "total_amount_cents": 50000,
  "delivery_cost_cents": 35000,
  "delivery_method": "russian_post",
  "tracking_number": null,
  "shipping_address": {
    "postal_code": "141631",
    "address": "г. Клин, ул. Лесная, д. 3"
  },
  "contact_info": {
    "firstname": "Иван",
    "lastname": "Иванов",
    "middlename": "Иванович",
    "phone": "+79991234567",
    "email": "ivan@example.com"
  },
  "created_at": "2025-12-10T12:00:00Z",
  "items": [...],
  "payment_url": "https://yookassa.ru/payments/..."
}
```

### `GET /`

**Описание**: Получение списка заказов текущего пользователя.

**Требования**: Аутентификация или session_id.

**Ответ**: Список объектов `OrderResponse` (без `payment_url`), отсортированных по дате создания (новые первые).

### `GET /{order_id}`

**Описание**: Получение деталей конкретного заказа.

**Параметры**: `order_id` (Integer).

**Особенности**:
- Автоматически проверяет статус платежа в ЮKassa для заказов со статусом `AWAITING_PAYMENT`.
- Если платёж уже оплачен — обновляет статус заказа на `PAID`.
- Возвращает `payment_url` для неоплаченных заказов (создаёт новый платёж если старый истёк).

**Ответ**: Объект `OrderResponse` с актуальным статусом и `payment_url` (если применимо).

### `POST /{order_id}/cancel`

**Описание**: Отмена заказа пользователем.

**Условия**: Заказ можно отменить только если он в статусе `AWAITING_PAYMENT`.

**Действия**:
1. Проверяет статус заказа.
2. Возвращает зарезервированные товары на склад (увеличивает `quantity`, уменьшает `reserved_quantity` в `SKU`).
3. Помечает связанный платеж как `FAILED`.
4. Устанавливает статус заказа `CANCELLED`.

**Ответ**: Обновленный объект `OrderResponse` со статусом `CANCELLED`.

---

## Статусы заказа

| Статус | Описание |
|--------|----------|
| `awaiting_payment` | Ожидает оплаты |
| `paid` | Оплачен |
| `processing` | Собирается |
| `shipped` | Передан в доставку |
| `delivered` | Доставлен |
| `cancelled` | Отменён |

---

## Методы доставки

| Метод | Описание | Стоимость |
|-------|----------|-----------|
| `pickup` | Самовывоз | Бесплатно (0) |
| `russian_post` | Почта России | Рассчитывается через API |

---

## Webhooks (ЮKassa)

Маршруты для приема уведомлений от платежной системы.
Префикс: `/api/v1/webhooks`.

### `POST /payment/yookassa`

**Описание**: Обработка уведомлений о статусе платежа.

**События**:
- `payment.succeeded` — Платёж успешен
- `payment.canceled` — Платёж отменён

**Действия при `payment.succeeded`**:
1. Находит платёж по `external_id`.
2. Проверяет статус в ЮKassa (верификация).
3. Обновляет статус платежа на `SUCCEEDED`.
4. Обновляет статус заказа на `PAID`.
5. Финализирует резерв склада (уменьшает `reserved_quantity`).

**Действия при `payment.canceled`**:
1. Обновляет статус платежа на `FAILED`.
2. Обновляет статус заказа на `CANCELLED`.
3. Возвращает товары на склад.

**Настройка в ЮKassa**:
URL: `https://api.localtea.ru/api/v1/webhooks/payment/yookassa`
События: `payment.succeeded`, `payment.canceled`

---

## Автоматическая проверка статуса

При запросе `GET /orders/{order_id}` для заказов со статусом `AWAITING_PAYMENT`:

1. Ищется активный платёж (`Payment` со статусом `PENDING`).
2. Запрашивается статус платежа в ЮKassa API.
3. Если статус `succeeded`:
   - Обновляется статус платежа и заказа.
   - Финализируется резерв склада.
4. Если статус `canceled`:
   - Платёж помечается как `FAILED`.
   - Создаётся новый платёж для повторной оплаты.
5. Если статус `pending`:
   - Возвращается существующий `payment_url`.

Это гарантирует корректное обновление статуса даже если webhook не был получен.

---

## Модели данных

### Order

```python
class Order(Base):
    id: int
    user_id: int | None
    session_id: str | None
    status: OrderStatus
    total_amount_cents: int          # Сумма товаров в копейках
    delivery_cost_cents: int         # Стоимость доставки в копейках
    discount_amount_cents: int       # Сумма скидки
    promo_code: str | None
    delivery_method: DeliveryMethod  # pickup | russian_post
    contact_info: dict               # JSONB с данными получателя
    shipping_address: dict | None    # JSONB с адресом доставки
    tracking_number: str | None      # Трек-номер отправления
    created_at: datetime
    expires_at: datetime             # Время истечения резерва
    
    items: List[OrderItem]
    payments: List[Payment]
```

### OrderItem

```python
class OrderItem(Base):
    id: int
    order_id: int
    sku_id: int
    title: str
    sku_info: str | None
    price_cents: int
    quantity: int
```

### Payment

```python
class Payment(Base):
    id: int
    order_id: int
    external_id: str          # ID платежа в ЮKassa
    amount_cents: int
    status: PaymentStatus     # pending | succeeded | failed
    provider_response: dict   # JSONB с ответом ЮKassa
```
