# API Модуль Payment

В этом документе описана интеграция с платёжной системой YooKassa.
Базовый префикс для маршрутов: `/api/v1`.

## Архитектура

Платёжная система состоит из следующих компонентов:

*   **YooKassaService** (`backend/services/payment/yookassa.py`): Сервис для взаимодействия с YooKassa API.
*   **Order endpoints** (`backend/api/v1/order/endpoints.py`): Эндпоинты, возвращающие payment_url.
*   **Webhook endpoint** (`backend/api/v1/webhooks/payment.py`): Обработка уведомлений от YooKassa.

---

## Поток платежа

1.  **Оформление заказа**: Пользователь вызывает `POST /orders/checkout`.
2.  **Создание платежа**: Backend создаёт платёж в YooKassa и сохраняет `yookassa_payment_id`.
3.  **Редирект**: Frontend получает `payment_url` и перенаправляет пользователя на страницу оплаты YooKassa.
4.  **Оплата**: Пользователь вводит данные карты на стороне YooKassa.
5.  **Return URL**: После оплаты пользователь возвращается на `/payment/success`.
6.  **Webhook**: YooKassa отправляет уведомление на webhook endpoint.
7.  **Обновление статуса**: Backend обновляет статус заказа на PAID.

---

## Эндпоинты

### `GET /orders/{order_id}`

*   **Описание**: Получение деталей заказа, включая ссылку на оплату.
*   **Параметры**: `order_id` (Integer).
*   **Авторизация**: Требуется (владелец заказа).
*   **Ответ**: Объект `OrderDetail`:
    *   Все поля заказа.
    *   `payment_url` (string, optional): Ссылка для оплаты (только для статуса AWAITING_PAYMENT).

**Логика payment_url**:
*   Если заказ в статусе AWAITING_PAYMENT — возвращается ссылка на оплату.
*   Если срок платежа истёк — создаётся новый платёж в YooKassa.
*   Для других статусов — `payment_url` отсутствует.

### `POST /webhooks/payment/yookassa`

*   **Описание**: Обработка webhook-уведомлений от YooKassa.
*   **Авторизация**: Не требуется (публичный endpoint).
*   **Защита**: IP Whitelist — запросы принимаются только от официальных IP-адресов YooKassa:
    *   `185.71.76.0/27`
    *   `185.71.77.0/27`
    *   `77.75.153.0/25`
    *   `77.75.156.11/32`
    *   `77.75.156.35/32`
    *   `77.75.154.128/25`
    *   `2a02:5180::/32`
*   **Тело запроса**: JSON от YooKassa с типом события.
*   **Ответ**: HTTP 200 OK.
*   **Ошибки**: `403 Forbidden` — Запрос от неавторизованного IP-адреса (в production).

**Обрабатываемые события**:
*   `payment.succeeded`: Платёж успешен → статус заказа меняется на PAID.
*   `payment.canceled`: Платёж отменён → статус заказа меняется на CANCELLED.

---

## Сервис YooKassaService

**Путь**: `backend/services/payment/yookassa.py`

### Методы

#### create_payment

*   **Описание**: Создаёт платёж в YooKassa.
*   **Параметры**:
    *   `amount_cents` (int): Сумма в копейках.
    *   `description` (string): Описание платежа.
    *   `order_id` (int): ID заказа.
    *   `customer_email` (string): Email клиента.
    *   `return_url` (string): URL для возврата после оплаты.
    *   `notification_url` (string): URL для webhook.
*   **Возвращает**: ID платежа и confirmation_url для редиректа.

#### get_payment

*   **Описание**: Получает статус платежа из YooKassa.
*   **Параметры**: `payment_id` (string).
*   **Возвращает**: Объект платежа со статусом (pending, succeeded, canceled).

---

## Конфигурация

### Переменные окружения

| Переменная | Описание |
|------------|----------|
| YOOKASSA_SHOP_ID | ID магазина в YooKassa |
| YOOKASSA_API_KEY | Секретный ключ API |
| YOOKASSA_RETURN_URL | URL для редиректа после оплаты (`https://localtea.ru/payment/success`) |
| YOOKASSA_WEBHOOK_URL | URL для webhook (`https://api.localtea.ru/api/v1/webhooks/payment/yookassa`) |

### Настройка Webhook в YooKassa Dashboard

1.  Перейти в раздел **Интеграция** → **HTTP-уведомления**.
2.  Указать URL: `https://api.localtea.ru/api/v1/webhooks/payment/yookassa`.
3.  Выбрать события: `payment.succeeded`, `payment.canceled`.
4.  Сохранить.

---

## Статусы заказа

| Статус | Описание |
|--------|----------|
| AWAITING_PAYMENT | Ожидает оплаты (начальный статус) |
| PAID | Оплачен |
| PROCESSING | Собирается |
| SHIPPED | Передан в доставку |
| DELIVERED | Доставлен |
| CANCELLED | Отменён |

---

## Автоматическая проверка статуса

При запросе `GET /orders/{order_id}` backend автоматически:

1.  Проверяет, есть ли `yookassa_payment_id` у заказа.
2.  Запрашивает статус платежа через YooKassa API.
3.  Обновляет статус заказа, если платёж завершён.
4.  Возвращает актуальный статус.

Это гарантирует актуальность статуса даже если webhook не был доставлен.

---

## Обработка ошибок

*   **Истёкший платёж**: Если платёж в YooKassa истёк (более 1 часа), создаётся новый.
*   **Ошибка API YooKassa**: Логируется ошибка, возвращается 502 Bad Gateway.
*   **Невалидный webhook**: Логируется предупреждение, возвращается 200 OK (для предотвращения повторных попыток).
