# API Маршруты (Endpoints) модуля Cart

В этом документе описаны маршруты API для работы с корзиной покупок.
Базовый префикс для всех маршрутов: `/api/v1/cart`.

## Идентификация корзины

Корзина привязывается к:
- **Авторизованному пользователю** — по `user_id`.
- **Гостю** — по `session_id` (передаётся в заголовке `X-Session-ID`).

При авторизации гостевая корзина автоматически мигрирует к пользователю.

---

## Маршруты

### `GET /`

**Описание**: Получение текущей корзины.

**Требования**: Аутентификация или session_id.

**Ответ** (`CartResponse`):
```json
{
  "id": 1,
  "items": [
    {
      "id": 10,
      "sku_id": 5,
      "quantity": 2,
      "fixed_price_cents": null,
      "sku": {
        "id": 5,
        "sku_code": "green-tea-100g",
        "weight": "100g",
        "price_cents": 50000,
        "discount_cents": 5000,
        "quantity": 50,
        "product": {
          "id": 1,
          "title": "Зелёный чай Лунцзин",
          "slug": "green-tea-longjing",
          "images": [...]
        }
      }
    }
  ],
  "total_price": 90000,
  "total_weight_grams": 200
}
```

**Примечание**: Если корзина не существует, создаётся автоматически.

### `POST /items`

**Описание**: Добавление товара (SKU) в корзину.

**Тело запроса** (`CartItemCreate`):
```json
{
  "sku_id": 5,
  "quantity": 2
}
```

**Действия**:
1. Проверяет существование SKU.
2. Проверяет наличие товара на складе.
3. Если товар уже в корзине — увеличивает количество.
4. Иначе — добавляет новую позицию.

**Ответ**: Обновлённый объект `CartResponse`.

**Ошибки**:
- `404`: SKU не найден.
- `400`: Недостаточно товара на складе.

### `PATCH /items/{item_id}`

**Описание**: Обновление количества товара в корзине.

**Параметры**: `item_id` — ID записи в корзине (не SKU ID).

**Тело запроса** (`CartItemUpdate`):
```json
{
  "quantity": 3
}
```

**Действия**:
1. Проверяет наличие товара на складе.
2. Обновляет количество.

**Ответ**: Обновлённый объект `CartResponse`.

**Ошибки**:
- `404`: Позиция корзины не найдена.
- `400`: Недостаточно товара на складе.

### `DELETE /items/{item_id}`

**Описание**: Удаление товара из корзины.

**Параметры**: `item_id` — ID записи в корзине.

**Ответ**: Обновлённый объект `CartResponse`.

### `DELETE /`

**Описание**: Полная очистка корзины.

**Ответ**: Пустой объект `CartResponse`.

---

## Модели данных

### Cart

```python
class Cart(Base):
    id: int
    user_id: int | None
    session_id: str | None
    created_at: datetime
    updated_at: datetime
    
    items: List[CartItem]
```

### CartItem

```python
class CartItem(Base):
    id: int
    cart_id: int
    sku_id: int
    quantity: int
    fixed_price_cents: int | None    # Фиксированная цена (для акций)
    created_at: datetime
    updated_at: datetime
    
    sku: SKU
```

---

## Вычисляемые поля

### `total_price`

Общая стоимость корзины в копейках:
```
sum(item.quantity * (item.fixed_price_cents or sku.price_cents - sku.discount_cents))
```

### `total_weight_grams`

Общий вес товаров в граммах (для расчёта доставки):
```
sum(item.quantity * sku.weight_grams)
```

---

## Технические детали

### Session ID

- Генерируется на клиенте (UUID) для гостей.
- Передаётся в заголовке `X-Session-ID`.
- Возвращается в заголовке ответа `X-Session-ID`.

### Обновление сессии SQLAlchemy

При изменении корзины используется `db.expire(cart)` для сброса кэша сессии и гарантии актуальных данных.

### Миграция корзины при авторизации

Когда гость авторизуется:
1. Находится корзина по `session_id`.
2. Корзина привязывается к `user_id`.
3. `session_id` обнуляется.
