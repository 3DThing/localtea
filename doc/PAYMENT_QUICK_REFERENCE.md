# Документация по платёжной системе — Краткий справочник

## ✅ Что реализовано

### Frontend

- ✅ **Страница успешной оплаты** (`/payment/success`)
  - Автоматический редирект в профиль через 10 сек
  - Информационное сообщение об успехе платежа

- ✅ **Кнопка "Оплатить заказ"** в профиле
  - Видна только для заказов со статусом "Ожидает оплаты"
  - Редирект на YooKassa для ввода карты

- ✅ **Обновление статуса заказа**
  - Автоматическое обновление при открытии профиля
  - Поддержка webhook-уведомлений от YooKassa

### Backend

- ✅ **Сервис YooKassa**
  - Создание платежей
  - Проверка статуса платежа
  - Переиспользование платежей (создание нового при истечении)

- ✅ **API endpoints**
  - `GET /api/v1/orders/{id}` — получить заказ с payment_url
  - `POST /api/v1/checkout` — создать заказ и платёж
  - `POST /api/v1/webhooks/payment/yookassa` — webhook-уведомления

- ✅ **Модель заказа**
  - Поля: `yookassa_payment_id`, `yookassa_payment_url`
  - Статусы: AWAITING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED

- ✅ **Безопасность**
  - Проверка подписи webhook'а
  - Валидация metadata в платежах
  - HTTPS для всех запросов

---

## 📁 Структура файлов

### Frontend

```
user_frontend/src/
├── app/
│   ├── payment/
│   │   └── success/
│   │       └── page.tsx         ← Страница успеха платежа
│   └── profile/
│       └── page.tsx             ← Кнопка "Оплатить заказ"
```

### Backend

```
backend/
├── services/payment/
│   └── yookassa.py              ← Сервис YooKassa
├── services/
│   └── order.py                 ← Логика платежей для заказов
└── api/v1/
    ├── order/
    │   └── endpoints.py         ← GET /orders/{id}, POST /checkout
    └── webhooks/
        └── endpoints.py         ← POST /webhooks/payment/yookassa
```

### Документация

```
doc/
├── PAYMENT_INTEGRATION.md                           ← Гайд платежей (главный файл)
├── USER_FRONTEND/
│   └── PAYMENT.md                                   ← Платежи на фронтенде
└── USER_BACKEND/API_MODULES/
    └── Payment.md                                   ← Платежи на бэкенде
```

---

## 🔑 Конфигурация

### .env переменные

```bash
# YooKassa
YOOKASSA_SHOP_ID=<ваш_shop_id>
YOOKASSA_API_KEY=live_<ваш_api_key>

# URLs
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
YOOKASSA_WEBHOOK_URL=https://api.localtea.ru/api/v1/webhooks/payment/yookassa
```

### Конфигурация YooKassa Dashboard

1. **Settings → Notifications**
   - Event: `payment.succeeded`
   - Event: `payment.canceled`
   - URL: `https://api.localtea.ru/api/v1/webhooks/payment/yookassa`

---

## 🧪 Тестирование

### Test-карты

| Карта | Результат |
|-------|-----------|
| 4111 1111 1111 1026 | ✅ Успешная оплата |
| 5105 1051 0510 5100 | ✅ Успешная оплата |

### Процесс тестирования

1. На странице профиля со статусом "Ожидает оплаты"
2. Нажать "Оплатить заказ"
3. Ввести test-карту и подтвердить
4. Должны перенаправить на `/payment/success`
5. Через 10 сек автоматический редирект в профиль
6. Статус должен обновиться на "Оплачен"

---

## 📊 Поток данных

```
Frontend                Backend               YooKassa
   │                      │                       │
   │─ GET /orders/123 ───→│                       │
   │                      │─ check status ─────→ │
   │                      │← payment data ──────│
   │← payment_url ────────│                       │
   │                                              │
   │─────── redirect ──────────────────────────→ │
   │                                              │
   │────── enter card ────────────────────────→ │
   │                                              │
   │← redirect to /payment/success               │
   │                                       (webhook)
   │                      ←─ webhook ────────── │
   │                      │ (payment.succeeded) │
   │                      │─ update DB ────────│
   │
   │─ GET /orders/123 ───→ (check again)
   │← status: PAID ───────│
```

---

## 🚨 Обработка ошибок

### При неудачном платеже

- Платёж на YooKassa может быть: `pending`, `canceled`, `expired`
- При отмене или истечении создаётся новый платёж
- Пользователь может повторить попытку

### При недоступности YooKassa

- Если YooKassa недоступна (503 error)
- Показать сообщение об ошибке: "Платёжная система недоступна"
- Предложить повторить позже

### При отсутствии webhook'а

- Статус платежа проверяется автоматически при открытии заказа
- Webhook гарантирует быстрое обновление, но не обязателен

---

## 📈 Логирование

### Backend логи

```bash
# Просмотр логов платежей
docker-compose logs -f backend | grep -i "payment\|yookassa"

# Ключевые события:
# - "Creating payment for order 123"
# - "Payment webhook received: succeeded"
# - "Order 123 status updated to PAID"
```

---

## ✔️ Production Checklist

Перед запуском в production:

- [ ] YooKassa аккаунт активирован
- [ ] Shop ID и API Key получены
- [ ] Переменные окружения установлены
- [ ] SSL сертификат настроен
- [ ] Webhook URL доступен из интернета
- [ ] Webhook-уведомления включены в Dashboard
- [ ] Протестирована оплата test-картой
- [ ] Проверена обработка отменённых платежей
- [ ] Email-уведомления о платежах работают
- [ ] Логирование включено

---

## 📚 Дополнительная документация

- **[PAYMENT_INTEGRATION.md](PAYMENT_INTEGRATION.md)** — Полный гайд (этот файл)
- **[USER_FRONTEND/PAYMENT.md](USER_FRONTEND/PAYMENT.md)** — Платежи на фронтенде
- **[USER_BACKEND/API_MODULES/Payment.md](USER_BACKEND/API_MODULES/Payment.md)** — Платежи на бэкенде
- **[YooKassa Developer Docs](https://yookassa.ru/developers/api)** — Официальная документация

---

## 🎯 Roadmap (будущее)

- [ ] Поддержка других способов оплаты (Яндекс.Касса, QIWI, etc.)
- [ ] Возвраты платежей (refund)
- [ ] Подписки и рекуррентные платежи
- [ ] Интеграция с 1С
- [ ] Мониторинг платежей (Prometheus/Grafana)

---

**Версия:** 2.0  
**Дата:** 10 декабря 2025  
**Статус:** ✅ Полностью реализовано и протестировано
