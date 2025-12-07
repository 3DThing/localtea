# Yookassa Payment Integration Plan

## Overview

This document provides a comprehensive plan for integrating Yookassa payment system into LocalTea e-commerce platform.

---

## Current Status

✅ **Implemented:**
- Basic Yookassa service structure (`backend/services/payment/yookassa.py`)
- Payment creation API calls
- Webhook endpoint (`/api/v1/webhooks/payment/yookassa`)
- Order model with payment tracking

⚠️ **Missing:**
- Webhook signature verification (CRITICAL)
- Complete error handling
- Payment status synchronization
- Refund support
- Production testing

---

## Implementation Plan

### Phase 1: Security Implementation (1-2 days) 🔴 CRITICAL

#### 1.1 Webhook Signature Verification

Yookassa sends webhooks with a signature header to verify authenticity.

﻿# Интеграция Yookassa — план

## Обзор

Документ описывает план интеграции платёжного сервиса Yookassa в платформу LocalTea.

---

## Текущий статус

✅ Реализовано:
- Базовая структура сервиса Yookassa (`backend/services/payment/yookassa.py`)
- Запросы на создание платежа (API)
- Вебхук-эндпоинт (`/api/v1/webhooks/payment/yookassa`)
- Модель заказа с отслеживанием платежей

⚠️ Недостаёт / нужно доработать:
- Проверка подписи вебхуков (КРИТИЧНО)
- Полная обработка ошибок
- Синхронизация статусов платежей
- Поддержка возвратов (refund)
- Тестирование в продакшн‑окружении

---

## План реализации

### Фаза 1: Безопасность (1–2 дня) — КРИТИЧНО

#### 1.1 Проверка подписи вебхуков

Yookassa присылает вебхуки с подписью в заголовке — нужно проверять её, чтобы исключить фальсификацию.

```python
# backend/services/payment/yookassa.py

import hmac
import hashlib

def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """
    Проверка подписи вебхука Yookassa.
    """
    if not settings.YOOKASSA_SECRET_KEY:
        raise ValueError("YOOKASSA_SECRET_KEY не настроен")

    expected_signature = hashlib.sha256(body + settings.YOOKASSA_SECRET_KEY.encode()).hexdigest()
    return hmac.compare_digest(signature, expected_signature)
```

#### 1.2 Обновление эндпоинта вебхука

Добавить проверку подписи, логирование и безопасную обработку ошибок.

```python
# backend/api/v1/webhooks/endpoints.py

from fastapi import APIRouter, Depends, Request, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services.order import order_service
from backend.services.payment.yookassa import verify_webhook_signature
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/payment/yookassa")
async def yookassa_webhook(
    request: Request,
    x_yoomoney_signature: str = Header(None),
    db: AsyncSession = Depends(deps.get_db)
):
    body = await request.body()

    if not x_yoomoney_signature:
        logger.error("Вебхук получен без подписи")
        raise HTTPException(status_code=403, detail="Missing signature")

    if not verify_webhook_signature(body, x_yoomoney_signature):
        logger.error("Неверная подпись вебхука")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        event = await request.json()
    except Exception as e:
        logger.error(f"Не удалось распарсить JSON вебхука: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")

    try:
        await order_service.process_payment_webhook(db, event)
    except Exception as e:
        logger.exception("Ошибка обработки вебхука")
        return {"status": "error_logged"}

    return {"status": "ok"}
```

#### 1.3 Рекомендация: белый список IP (опционально)

Yookassa использует ограниченные IP‑диапазоны — дополнительная проверка IP повысит безопасность.

```python
# backend/core/config.py
YOOKASSA_WEBHOOK_IPS: list[str] = [
    "185.71.76.0/27",
    "185.71.77.0/27",
    "77.75.153.0/25",
    "77.75.154.128/25",
]

# backend/api/v1/webhooks/endpoints.py
from ipaddress import ip_address, ip_network

def is_yookassa_ip(client_ip: str) -> bool:
    try:
        ip = ip_address(client_ip)
        for network in settings.YOOKASSA_WEBHOOK_IPS:
            if ip in ip_network(network):
                return True
    except ValueError:
        return False
    return False

# и вызывать is_yookassa_ip(request.client.host) при необходимости
```

---

### Фаза 2: Полный платёжный поток (2–3 дня)

#### 2.1 Обработка вебхуков

```python
# backend/services/order.py

from backend.models.order import Payment, PaymentStatus
from backend.services.email import send_order_confirmation_email
from typing import Dict, Any

class OrderService:
    async def process_payment_webhook(self, db: AsyncSession, event: Dict[str, Any]) -> None:
        event_type = event.get("event")
        payment_data = event.get("object", {})
        payment_id = payment_data.get("id")

        if not payment_id:
            raise ValueError("В вебхуке отсутствует payment_id")

        stmt = select(Payment).where(Payment.payment_id == payment_id)
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            # Создать запись о платеже при первом вебхуке
            # db.add(payment)
            pass

        old_status = payment.status if payment else None

        if event_type == "payment.succeeded":
            payment.status = PaymentStatus.SUCCEEDED
        elif event_type == "payment.canceled":
            payment.status = PaymentStatus.CANCELED
        elif event_type == "payment.waiting_for_capture":
            payment.status = PaymentStatus.PENDING

        payment.provider_data = payment_data
        await db.commit()

        logger.info(f"Payment {payment_id} status changed: {old_status} -> {payment.status}")
```

#### 2.2 Создание платежа при оформлении заказа

```python
# backend/services/order.py

async def initiate_payment(self, db: AsyncSession, order_id: int) -> Dict[str, Any]:
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != OrderStatus.AWAITING_PAYMENT:
        raise HTTPException(status_code=400, detail="Order is not awaiting payment")

    payment_data = await payment_service.create_payment(order, description=f"Заказ #{order.id} на localtea.ru")

    payment = Payment(
        order_id=order.id,
        payment_id=payment_data["payment_id"],
        amount_cents=order.total_amount_cents,
        status=PaymentStatus.PENDING,
        provider="yookassa",
        provider_data=payment_data,
    )
    db.add(payment)
    await db.commit()

    return {"payment_id": payment_data["payment_id"], "payment_url": payment_data["payment_url"], "status": "pending"}
```

#### 2.3 Фронтенд интеграция

Клиентская часть должна инициировать платёж и перенаправлять пользователя на URL подтверждения Yookassa, а затем обрабатывать результат (redirection или вебхук).

---

### Фаза 3: Обработка ошибок и крайних случаев (1–2 дня)

#### 3.1 Истечение времени оплаты

План: задача Celery, которая отменяет просроченные неоплаченные заказы (например, старше 30 минут).

#### 3.2 Идемпотентность

Использовать SELECT FOR UPDATE и проверять текущий статус платежа, чтобы безопасно обрабатывать повторные вебхуки.

---

### Фаза 4: Тестирование (2–3 дня)

Юнит‑тесты и интеграционные тесты должны покрывать:
- проверку подписи вебхуков
- создание платежа
- обработку вебхуков (успешный платёж, отмена, ожидание захвата)
- истечение времени и отмену

---

## Продакшн‑деплой

### Переменные окружения (пример)

```env
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=live_xxx...
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
```

### Мониторинг и логирование

Рекомендовано добавить метрики (Prometheus) и структурированное логирование для платёжных событий.

---

## Таймлайн

Общая оценка: 6–10 дней (включая тесты и QA)

---

**Версия документа:** 1.0  
**Последнее обновление:** 7 декабря 2025  
**Автор:** GitHub Copilot
        "order_id": order.id,
        "amount_cents": order.total_amount_cents,
        "payment_provider": "yookassa"
    }
)
```

---

## Timeline

**Total Estimated Time: 6-10 days**

| Phase | Duration | Priority |
|-------|----------|----------|
| Security Implementation | 1-2 days | CRITICAL |
| Complete Payment Flow | 2-3 days | HIGH |
| Error Handling | 1-2 days | HIGH |
| Testing | 2-3 days | HIGH |
| Production Deployment | 1 day | HIGH |

---

## Configuration

### Test Environment

```env
YOOKASSA_SHOP_ID=test_shop_id
YOOKASSA_SECRET_KEY=test_xxx...
YOOKASSA_RETURN_URL=http://localhost:3000/payment/success
```

### Production Environment

```env
YOOKASSA_SHOP_ID=your_production_shop_id
YOOKASSA_SECRET_KEY=live_xxx...
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
```

---

## Support & Documentation

- **Yookassa API Docs:** https://yookassa.ru/developers/api
- **Webhook Reference:** https://yookassa.ru/developers/using-api/webhooks
- **Test Environment:** https://yookassa.ru/developers/using-api/testing

---

**Document Version:** 1.0  
**Last Updated:** December 7, 2025  
**Author:** GitHub Copilot
