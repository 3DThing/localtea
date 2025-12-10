# Интеграция платёжной системы YooKassa

## Что это?

YooKassa — платёжный шлюз от Яндекса для принятия платежей по банковским картам и другим способам.

---

## Текущий статус

✅ **Реализовано:**
- Сервис YooKassa (`backend/services/payment/yookassa.py`)
- Создание платежей в YooKassa API
- Webhook-эндпоинт (`/api/v1/webhooks/payment/yookassa`)
- Модель заказа с отслеживанием платежей
- Страница успешной оплаты (`/payment/success`)
- Кнопка оплаты заказа в профиле
- Автоматическая проверка статуса платежа
- Обновление статуса заказа при успешном платеже

✅ **Протестировано:**
- Создание платежа и редирект на YooKassa
- Webhook-уведомления о платеже
- Обновление статуса заказа в БД
- Редирект на /payment/success после оплаты

---

## Быстрый старт

### 1. Получить учётные данные

1. Перейти на [yookassa.ru](https://yookassa.ru/)
2. Создать аккаунт (потребуется ИНН компании)
3. Пройти KYC верификацию
4. Получить **Shop ID** и **Secret Key** (API ключ)

### 2. Переменные окружения

В файле `.env` добавить:

```env
YOOKASSA_SHOP_ID=123456
YOOKASSA_API_KEY=live_abcdef123456...
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
YOOKASSA_WEBHOOK_URL=https://api.localtea.ru/api/v1/webhooks/payment/yookassa
```

### 3. Запустить приложение

```bash
docker-compose up -d --build
docker-compose exec backend alembic upgrade head
```

### 4. Настроить webhook в YooKassa Dashboard

1. Перейти в **Dashboard → Settings → Notifications**
2. Включить события: `payment.succeeded`, `payment.canceled`
3. URL: `https://api.localtea.ru/api/v1/webhooks/payment/yookassa`
4. Проверить доступность URL

### 5. Протестировать

На странице профиля:
- Нажать "Оплатить заказ" для заказа со статусом "Ожидает оплаты"
- Использовать test-карту: **4111 1111 1111 1026**
- Ввести любые дату и CVC
- Подтвердить платёж

Должны перенаправить на `/payment/success`.

---

## Архитектура

### Фронтенд

**Файлы:**
- `src/app/profile/page.tsx` — Кнопка "Оплатить заказ"
- `src/app/payment/success/page.tsx` — Страница успеха
- `src/lib/api.ts` — API клиент

**Поток:**
1. Кнопка "Оплатить заказ" на странице профиля
2. Запрос `GET /api/v1/orders/{id}` → получение `payment_url`
3. Редирект `window.location.href = payment_url`
4. Пользователь вводит карту на YooKassa
5. YooKassa редиректит на `/payment/success`
6. Страница автоматически редиректит в профиль через 10 сек

### Бэкенд

**Файлы:**
- `backend/services/payment/yookassa.py` — Сервис YooKassa
- `backend/services/order.py` — Бизнес-логика заказов
- `backend/api/v1/order/endpoints.py` — API endpoints
- `backend/api/v1/webhooks/endpoints.py` — Webhook endpoint
- `backend/models/order.py` — Модель Order

**Поток:**
1. `GET /api/v1/orders/{id}` → check_and_update_order_status()
2. Если статус AWAITING_PAYMENT → get_payment_url()
3. Если платёж истёк → create_yookassa_payment()
4. Возвращаем `payment_url` фронтенду
5. Параллельно YooKassa отправляет webhook
6. Webhook обновляет статус заказа на PAID

---

## Статусы платежей

### YooKassa → Order.status

| YooKassa | Order | Описание |
|----------|-------|----------|
| pending | AWAITING_PAYMENT | Ожидаем ввода карты |
| succeeded | PAID | Успешно оплачено ✅ |
| canceled | AWAITING_PAYMENT | Отменено пользователем |
| expired | AWAITING_PAYMENT | Истекло время (создаём новый) |

---

## API Endpoints

### GET /api/v1/orders/{order_id}

Получить деталь заказа с автопроверкой статуса платежа.

**Request:**
```http
GET /api/v1/orders/123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 123,
  "status": "awaiting_payment",
  "total_price_cents": 500000,
  "payment_url": "https://payment.yookassa.ru/...",
  "paid_at": null,
  "delivery_info": {
    "method": "russian_post",
    "cost_cents": 50000,
    "tracking_number": null
  }
}
```

### POST /api/v1/checkout

Создать заказ и платёж.

**Request:**
```json
{
  "items": [
    { "sku_id": 1, "quantity": 2 }
  ],
  "delivery_method": "russian_post",
  "delivery_data": {
    "address": "ул. Пушкина, д. 10",
    "postal_code": "119991",
    "phone": "+7 999 999 99 99"
  }
}
```

**Response:**
```json
{
  "order_id": 123,
  "total_price_cents": 500000,
  "payment_url": "https://payment.yookassa.ru/..."
}
```

### POST /api/v1/webhooks/payment/yookassa

Webhook от YooKassa о статусе платежа.

**YooKassa → Backend:**
```json
{
  "type": "notification",
  "event": "payment.succeeded",
  "object": {
    "type": "payment",
    "id": "yookassa_payment_id",
    "status": "succeeded",
    "metadata": {
      "order_id": "123"
    }
  }
}
```

**Backend действия:**
1. Проверить подпись webhook'а
2. Получить order_id из metadata
3. Обновить статус заказа на PAID
4. Отправить email подтверждение

---

## Тестовые карты

| Карта | Результат |
|-------|-----------|
| 4111 1111 1111 1026 | ✅ Успешная оплата |
| 5105 1051 0510 5100 | ✅ Успешная оплата |
| 3782 822463 10005 | ✅ Успешная оплата (Amex) |
| 4000 0000 0000 0002 | ❌ Отказано банком |

---

## Безопасность

### Проверка подписи webhook'а

```python
import hashlib
import hmac

def verify_yookassa_signature(data: bytes, signature: str) -> bool:
    expected = hashlib.sha256(
        data + settings.YOOKASSA_API_KEY.encode()
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)
```

### Хранение данных

- ❌ Не хранить номера карт (YooKassa их не передаёт)
- ✅ Хранить только: статус, amount, payment_id, дату
- ✅ Использовать HTTPS для всех запросов
- ✅ Передавать токен только в httpOnly cookies

---

## Обработка ошибок

### На фронтенде

```tsx
try {
  const { payment_url } = await api.get(`/orders/${orderId}`);
  window.location.href = payment_url;
} catch (error) {
  if (error.response?.status === 503) {
    showError("Платёжная система недоступна");
  } else {
    showError("Ошибка сети");
  }
}
```

### На бэкенде

```python
try:
    payment = await yookassa.get_payment(payment_id)
    if payment['status'] == 'succeeded':
        order.status = OrderStatus.PAID
except YooKassaError:
    # При ошибке создаём новый платёж
    await create_yookassa_payment(order)
```

---

## Логирование

**Backend логи:**
```
INFO: Creating payment for order 123
INFO: Payment URL: https://payment.yookassa.ru/...
INFO: Payment webhook received: succeeded
INFO: Order 123 status updated to PAID
ERROR: YooKassa API error: 401 Unauthorized
```

**Просмотр:**
```bash
docker-compose logs -f backend
```

---

## Production Checklist

- [ ] YooKassa аккаунт активирован и верифицирован
- [ ] Shop ID и API Key получены
- [ ] Переменные окружения установлены в `.env`
- [ ] SSL сертификат настроен (HTTPS обязателен)
- [ ] Webhook URL доступен из интернета
- [ ] Webhook-уведомления включены в Dashboard
- [ ] Email-уведомления о платежах работают
- [ ] Логирование включено
- [ ] Тестовая оплата test-картой прошла успешно
- [ ] Проверена обработка отменённых платежей

---

## Альтернативные способы оплаты

YooKassa поддерживает:
- ✅ Банковские карты (Visa, MasterCard, МИР)
- ✅ Яндекс.Касса
- ✅ Яндекс.Деньги
- ✅ QIWI кошелёк
- ✅ WebMoney
- ✅ Сбербанк Онлайн
- ✅ Apple Pay, Google Pay

Добавить нужно в параметр `payment_method_data` при создании платежа.

---

## Документация

- [USER_FRONTEND/PAYMENT.md](doc/USER_FRONTEND/PAYMENT.md) — Фронтенд
- [USER_BACKEND/API_MODULES/Payment.md](doc/USER_BACKEND/API_MODULES/Payment.md) — Бэкенд
- [Официальная документация YooKassa](https://yookassa.ru/developers/api)

---

**Версия:** 2.0  
**Обновлено:** 10 декабря 2025  
**Статус:** ✅ Полностью реализовано и протестировано

