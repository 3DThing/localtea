# USER_FRONTEND — Платежная система YooKassa

## Обзор

Интеграция платёжной системы **YooKassa** для обработки платежей заказов.

**Ключевые компоненты**:
- Кнопка оплаты в профиле (для заказов со статусом "Ожидает оплаты")
- Страница успешного платежа `/payment/success`
- Редирект на YooKassa для оплаты
- Автоматическое обновление статуса заказа

---

## Поток платежа

```
1. Пользователь нажимает "Оплатить заказ"
   ↓
2. Frontend запрашивает payment_url у API
   GET /api/v1/orders/{order_id}
   ↓
3. Backend создаёт платёж в YooKassa и возвращает ссылку
   ↓
4. Frontend редиректит на YooKassa
   window.location.href = payment_url
   ↓
5. Пользователь вводит данные карты на YooKassa
   ↓
6. YooKassa редиректит на /payment/success
   ↓
7. Страница успеха проверяет статус заказа и редиректит в профиль
```

---

## Страница успеха (`/payment/success`)

**Расположение**: `src/app/payment/success/page.tsx`

### Функционал

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Text, Button, Stack, Alert } from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/profile?tab=orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <Container size="sm" py={50}>
      <Stack align="center" gap="lg">
        <IconCheck size={80} color="green" />
        
        <div>
          <Text size="xl" fw={500}>Платёж принят!</Text>
          <Text c="dimmed">
            Спасибо за ваш заказ. Статус будет обновлён в ближайшее время.
          </Text>
        </div>

        <Alert 
          icon={<IconAlertCircle />}
          color="blue"
          title="Перенаправление"
        >
          Вы будете перенаправлены в профиль через {countdown} сек...
        </Alert>

        <Button 
          onClick={() => router.push('/profile?tab=orders')}
          variant="light"
        >
          Перейти в профиль сейчас
        </Button>
      </Stack>
    </Container>
  );
}
```

### Логика

1. **Автоматический редирект** — через 10 секунд в профиль (`/profile?tab=orders`)
2. **Кнопка пропуска** — можно перейти в профиль сразу
3. **Информационное сообщение** — уведомление об успехе платежа

> **Важно**: Статус заказа обновляется автоматически на бэкенде через YooKassa webhook или при следующем запросе деталей заказа.

---

## Кнопка оплаты в профиле

**Расположение**: `src/app/profile/page.tsx`

### Условие отображения

```tsx
// Кнопка отображается только если:
// 1. Статус заказа === AWAITING_PAYMENT
// 2. Заказ принадлежит текущему пользователю

{order.status === 'awaiting_payment' && (
  <Button 
    onClick={() => payOrder(order.id)}
    color="green"
    loading={paymentLoading}
  >
    Оплатить заказ
  </Button>
)}
```

### Функция оплаты

```tsx
const payOrder = async (orderId: number) => {
  try {
    setPaymentLoading(true);
    
    // 1. Запрашиваем payment_url у API
    const response = await apiClient.get(
      `/orders/${orderId}`
    );
    
    const { payment_url } = response.data;
    
    if (!payment_url) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось получить ссылку на оплату',
        color: 'red',
      });
      return;
    }
    
    // 2. Редиректим на YooKassa
    window.location.href = payment_url;
    
  } catch (error) {
    notifications.show({
      title: 'Ошибка платежа',
      message: 'Попробуйте позже',
      color: 'red',
    });
  } finally {
    setPaymentLoading(false);
  }
};
```

---

## Конфигурация YooKassa

**Расположение**: `.env` и `src/lib/api.ts`

### Переменные окружения

```bash
# .env.local
NEXT_PUBLIC_YOOKASSA_SHOP_ID=<ваш_shop_id>
NEXT_PUBLIC_YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
```

### Параметры платежа (на бэкенде)

```python
# backend/services/payment/yookassa.py

payment_data = {
    "amount": {
        "value": str(amount_rub),  # Сумма в рублях
        "currency": "RUB"
    },
    "payment_method_data": {
        "type": "payment_card"
    },
    "confirmation": {
        "type": "redirect",
        "return_url": "https://localtea.ru/payment/success"
    },
    "description": f"Заказ #{order_id}",
    "metadata": {
        "order_id": order_id,
        "customer_email": customer_email
    },
    "notification_url": "https://api.localtea.ru/api/v1/webhooks/payment/yookassa"
}
```

---

## API Endpoints

### Получить ссылку на оплату

```http
GET /api/v1/orders/{order_id}
Authorization: Bearer <token>
```

**Ответ**:
```json
{
  "id": 123,
  "status": "awaiting_payment",
  "total_price_cents": 500000,
  "payment_url": "https://payment.yookassa.ru/...checkout_id=...",
  "paid_at": null,
  "delivery_info": {
    "method": "russian_post",
    "cost_cents": 50000,
    "tracking_number": null
  }
}
```

### Webhook (уведомление о платеже)

```http
POST /api/v1/webhooks/payment/yookassa
Content-Type: application/json

{
  "type": "notification",
  "event": "payment.succeeded",
  "object": {
    "type": "payment",
    "id": "yookassa_payment_id",
    "status": "succeeded",
    "metadata": {
      "order_id": 123
    }
  }
}
```

**Действия**:
1. Backend проверяет подпись webhook
2. Получает order_id из metadata
3. Обновляет статус заказа на PAID
4. Отправляет email подтверждение

---

## Обработка ошибок платежа

### На фронтенде

```tsx
// Если payment_url не получена
if (!payment_url) {
  notifications.show({
    title: 'Ошибка платежа',
    message: 'Не удалось создать платёж. Попробуйте позже.',
    color: 'red',
  });
}

// Если сеть недоступна
if (error.response?.status === 503) {
  notifications.show({
    title: 'Сервис недоступен',
    message: 'YooKassa временно недоступна. Попробуйте позже.',
    color: 'red',
  });
}
```

### На бэкенде

```python
# backend/api/v1/order/endpoints.py

@router.get("/{order_id}")
async def get_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    # 1. Получить заказ
    order = await get_order(session, order_id)
    
    if order.status == OrderStatus.AWAITING_PAYMENT:
        try:
            # 2. Проверить статус платежа в YooKassa
            actual_status = await check_yookassa_payment(order.yookassa_payment_id)
            
            if actual_status == "succeeded":
                # 3. Обновить статус заказа
                order.status = OrderStatus.PAID
                await session.commit()
        
        except YooKassaError:
            # 4. Если ошибка — создать новый платёж
            payment_url = await create_yookassa_payment(order)
            return {"payment_url": payment_url}
```

---

## Статусы платежей в YooKassa

| Статус YooKassa | Статус заказа | Описание |
|---|---|---|
| `pending` | AWAITING_PAYMENT | Платёж ожидает ввода данных карты |
| `succeeded` | PAID | Платёж успешно обработан |
| `canceled` | AWAITING_PAYMENT | Пользователь отменил платёж на YooKassa |
| `expired` | AWAITING_PAYMENT | Платёж истёк (>1 часа) |

> **Примечание**: При истечении платежа создаётся новый платёж.

---

## Безопасность

### Проверка подписи webhook

```python
import hashlib
import hmac

def verify_yookassa_signature(data: bytes, signature: str) -> bool:
    """Проверяет подпись webhook YooKassa"""
    secret = settings.YOOKASSA_API_KEY
    
    expected = hashlib.sha256(
        data + secret.encode()
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)
```

### Хранение платёжных данных

- ❌ **Не хранить** данные карт (CVC, номер полностью)
- ✅ **Хранить** только:
  - Статус платежа
  - ID платежа в YooKassa
  - Сумму платежа
  - Дату платежа

---

## Тестирование платежей

### Test-карты YooKassa

| Карта | CVC | Результат |
|---|---|---|
| `4111 1111 1111 1026` | Любой | ✅ Успешный платёж |
| `5105 1051 0510 5100` | Любой | ✅ Успешный платёж |
| `3782 822463 10005` | Любой | ✅ Успешный платёж (Amex) |

### Процесс тестирования

1. На странице профиля нажать "Оплатить заказ"
2. На YooKassa ввести test-карту
3. Ввести любую дату и CVC
4. Подтвердить платёж
5. Должны перенаправить на `/payment/success`

---

## Конфигурация YooKassa Dashboard

### Настройки шопа

1. **Shop ID** — уникальный идентификатор магазина
2. **API ключ** — для запросов к API YooKassa
3. **Return URL** — куда редиректить после платежа:
   ```
   https://localtea.ru/payment/success
   ```
4. **Notification URL** — для webhook-уведомлений:
   ```
   https://api.localtea.ru/api/v1/webhooks/payment/yookassa
   ```

### Включить webhook-уведомления

1. Перейти в Dashboard → Settings → Notifications
2. Включить: `payment.succeeded`, `payment.canceled`
3. Добавить URL: `https://api.localtea.ru/api/v1/webhooks/payment/yookassa`

---

## Отладка

### Логирование платежей

```tsx
// В браузере (DevTools Console)
// Проверить, была ли отправлена заявка
console.log('Redirecting to YooKassa...');
```

### На сервере

```python
import logging

logger = logging.getLogger(__name__)

logger.info(f"Creating payment for order {order_id}")
logger.info(f"Payment URL: {payment_url}")
logger.info(f"YooKassa response: {response}")
```

### Статус в Redis

```bash
# Проверить последний платёж заказа
redis-cli get "order:123:payment_id"
# Результат: "yookassa_payment_id_12345"
```
