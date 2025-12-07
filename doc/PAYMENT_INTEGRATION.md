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

```python
# backend/services/payment/yookassa.py

import hmac
import hashlib

def verify_webhook_signature(body: bytes, signature: str) -> bool:
    """
    Verify Yookassa webhook signature.
    
    Args:
        body: Raw request body bytes
        signature: Signature from X-Yoomoney-Signature header
    
    Returns:
        True if signature is valid
    """
    if not settings.YOOKASSA_SECRET_KEY:
        raise ValueError("YOOKASSA_SECRET_KEY not configured")
    
    expected_signature = hashlib.sha256(
        body + settings.YOOKASSA_SECRET_KEY.encode()
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
```

#### 1.2 Update Webhook Endpoint

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
) -> dict:
    """
    Webhook for Yookassa payment status updates.
    
    Security:
    - Verifies webhook signature
    - Logs all webhook events
    - Validates payment data
    """
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify signature
    if not x_yoomoney_signature:
        logger.error("Webhook received without signature")
        raise HTTPException(status_code=403, detail="Missing signature")
    
    if not verify_webhook_signature(body, x_yoomoney_signature):
        logger.error(f"Invalid webhook signature: {x_yoomoney_signature[:20]}...")
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # Parse event
    try:
        event = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse webhook JSON: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Log event (without sensitive data)
    logger.info(
        f"Yookassa webhook received: "
        f"event_type={event.get('event')}, "
        f"payment_id={event.get('object', {}).get('id')}"
    )
    
    # Process webhook
    try:
        await order_service.process_payment_webhook(db, event)
    except Exception as e:
        logger.error(f"Failed to process webhook: {e}", exc_info=True)
        # Return 200 to prevent Yookassa from retrying
        # Log error for manual investigation
        return {"status": "error_logged"}
    
    return {"status": "ok"}
```

#### 1.3 IP Whitelist (Optional but Recommended)

Yookassa sends webhooks from specific IP ranges.

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
    """Check if request comes from Yookassa IP range"""
    try:
        ip = ip_address(client_ip)
        for network in settings.YOOKASSA_WEBHOOK_IPS:
            if ip in ip_network(network):
                return True
        return False
    except ValueError:
        return False

@router.post("/payment/yookassa")
async def yookassa_webhook(
    request: Request,
    x_yoomoney_signature: str = Header(None),
    db: AsyncSession = Depends(deps.get_db)
):
    # Verify IP
    client_ip = request.client.host
    if not is_yookassa_ip(client_ip):
        logger.warning(f"Webhook from unauthorized IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Unauthorized IP")
    
    # ... rest of the code
```

---

### Phase 2: Complete Payment Flow (2-3 days)

#### 2.1 Payment Webhook Processing

```python
# backend/services/order.py

from backend.models.order import Payment, PaymentStatus
from backend.services.email import send_order_confirmation_email
from typing import Dict, Any

class OrderService:
    async def process_payment_webhook(
        self, 
        db: AsyncSession, 
        event: Dict[str, Any]
    ) -> None:
        """
        Process Yookassa payment webhook.
        
        Event structure:
        {
            "event": "payment.succeeded" | "payment.canceled" | "payment.waiting_for_capture",
            "object": {
                "id": "payment_id",
                "status": "succeeded",
                "amount": {"value": "100.00", "currency": "RUB"},
                "metadata": {"order_id": "123"},
                ...
            }
        }
        """
        event_type = event.get("event")
        payment_data = event.get("object", {})
        payment_id = payment_data.get("id")
        
        if not payment_id:
            raise ValueError("Missing payment_id in webhook")
        
        # Find payment in database
        stmt = select(Payment).where(Payment.payment_id == payment_id)
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()
        
        if not payment:
            # First webhook - create payment record
            order_id = int(payment_data.get("metadata", {}).get("order_id"))
            if not order_id:
                raise ValueError("Missing order_id in metadata")
            
            payment = Payment(
                order_id=order_id,
                payment_id=payment_id,
                amount_cents=int(float(payment_data["amount"]["value"]) * 100),
                status=PaymentStatus.PENDING,
                provider="yookassa",
                provider_data=payment_data
            )
            db.add(payment)
        
        # Update payment status based on event
        old_status = payment.status
        
        if event_type == "payment.succeeded":
            payment.status = PaymentStatus.SUCCEEDED
            payment.paid_at = datetime.now(timezone.utc)
            
            # Update order status
            order = await db.get(Order, payment.order_id)
            if order:
                order.status = OrderStatus.PAID
                order.paid_at = datetime.now(timezone.utc)
                
                # Send confirmation email
                await send_order_confirmation_email(order)
        
        elif event_type == "payment.canceled":
            payment.status = PaymentStatus.CANCELED
            
            # Update order status
            order = await db.get(Order, payment.order_id)
            if order:
                order.status = OrderStatus.CANCELED
                
                # Release reserved stock
                await self.release_order_stock(db, order)
        
        elif event_type == "payment.waiting_for_capture":
            payment.status = PaymentStatus.PENDING
        
        # Store full webhook data
        payment.provider_data = payment_data
        
        await db.commit()
        
        # Log status change
        logger.info(
            f"Payment {payment_id} status changed: "
            f"{old_status} -> {payment.status} for order {payment.order_id}"
        )
```

#### 2.2 Payment Creation During Checkout

```python
# backend/services/order.py

async def initiate_payment(
    self,
    db: AsyncSession,
    order_id: int
) -> Dict[str, Any]:
    """
    Create payment in Yookassa and return payment URL.
    
    Returns:
        {
            "payment_id": "...",
            "payment_url": "https://yookassa.ru/checkout/...",
            "status": "pending"
        }
    """
    # Get order
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.status != OrderStatus.AWAITING_PAYMENT:
        raise HTTPException(
            status_code=400, 
            detail=f"Order is in {order.status} status, cannot initiate payment"
        )
    
    # Create payment in Yookassa
    payment_data = await payment_service.create_payment(
        order=order,
        description=f"Заказ #{order.id} на localtea.ru"
    )
    
    # Store payment info
    payment = Payment(
        order_id=order.id,
        payment_id=payment_data["payment_id"],
        amount_cents=order.total_amount_cents,
        status=PaymentStatus.PENDING,
        provider="yookassa",
        provider_data=payment_data
    )
    db.add(payment)
    await db.commit()
    
    return {
        "payment_id": payment_data["payment_id"],
        "payment_url": payment_data["payment_url"],
        "status": "pending"
    }
```

#### 2.3 Frontend Integration

```typescript
// user_frontend/src/app/checkout/payment/page.tsx

'use client';

import { useState } from 'react';
import { Button, Text, Loader } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function PaymentPage({ params }: { params: { orderId: string } }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Initiate payment
      const response = await api.post(`/api/v1/orders/${params.orderId}/pay`);
      const { payment_url } = response.data;
      
      // Redirect to Yookassa
      window.location.href = payment_url;
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setLoading(false);
    }
  };
  
  return (
    <div>
      <Text size="xl" fw={700} mb="md">Оплата заказа</Text>
      
      <Button
        size="lg"
        onClick={handlePayment}
        loading={loading}
        disabled={loading}
      >
        {loading ? <Loader size="sm" /> : 'Перейти к оплате'}
      </Button>
    </div>
  );
}
```

```typescript
// user_frontend/src/app/payment/success/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Title, Text, Button, Stack } from '@mantine/core';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  return (
    <Stack align="center" gap="lg" mt={60}>
      <Title order={1}>✅ Оплата успешна!</Title>
      <Text size="lg">Ваш заказ #{orderId} оплачен</Text>
      <Text c="dimmed">
        Мы отправили подтверждение на вашу электронную почту
      </Text>
      
      <Button
        onClick={() => router.push(`/orders/${orderId}`)}
        size="lg"
      >
        Посмотреть заказ
      </Button>
    </Stack>
  );
}
```

---

### Phase 3: Error Handling & Edge Cases (1-2 days)

#### 3.1 Payment Expiry

```python
# backend/worker.py

@celery_app.task
def check_expired_payments():
    """
    Check for expired payments and cancel orders.
    Run every 5 minutes.
    """
    with sync_session() as db:
        # Find orders with expired payments (older than 30 min)
        expiry_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        stmt = select(Order).where(
            Order.status == OrderStatus.AWAITING_PAYMENT,
            Order.created_at < expiry_time
        )
        result = db.execute(stmt)
        expired_orders = result.scalars().all()
        
        for order in expired_orders:
            # Cancel order
            order.status = OrderStatus.EXPIRED
            
            # Release stock
            for item in order.items:
                sku = db.get(SKU, item.sku_id)
                if sku:
                    sku.reserved_quantity -= item.quantity
                    sku.quantity += item.quantity
            
            db.commit()
            
            # Log
            logger.info(f"Expired order {order.id} cancelled and stock released")
```

#### 3.2 Idempotency

Yookassa may send duplicate webhooks. Ensure idempotency:

```python
# Use transaction isolation level
async def process_payment_webhook(self, db: AsyncSession, event: Dict):
    # Use SELECT FOR UPDATE to prevent race conditions
    stmt = (
        select(Payment)
        .where(Payment.payment_id == payment_id)
        .with_for_update()
    )
    result = await db.execute(stmt)
    payment = result.scalar_one_or_none()
    
    # Check if already processed
    if payment and payment.status == PaymentStatus.SUCCEEDED:
        logger.info(f"Payment {payment_id} already processed, skipping")
        return
    
    # Process...
```

---

### Phase 4: Testing (2-3 days)

#### 4.1 Unit Tests

```python
# tests/test_payment.py

import pytest
from unittest.mock import Mock, patch
from backend.services.payment.yookassa import payment_service, verify_webhook_signature

def test_verify_webhook_signature_valid():
    body = b'{"event":"payment.succeeded"}'
    # Generate valid signature
    import hashlib, hmac
    secret = "test_secret"
    signature = hashlib.sha256(body + secret.encode()).hexdigest()
    
    with patch('backend.core.config.settings.YOOKASSA_SECRET_KEY', secret):
        assert verify_webhook_signature(body, signature) is True

def test_verify_webhook_signature_invalid():
    body = b'{"event":"payment.succeeded"}'
    signature = "invalid_signature"
    
    assert verify_webhook_signature(body, signature) is False

@pytest.mark.asyncio
async def test_create_payment():
    order = Mock(id=123, total_amount_cents=10000)
    
    with patch('httpx.AsyncClient') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "payment_123",
            "status": "pending",
            "confirmation": {"confirmation_url": "https://yookassa.ru/..."}
        }
        mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
        
        result = await payment_service.create_payment(order, "Test payment")
        
        assert result["payment_id"] == "payment_123"
        assert "payment_url" in result
```

#### 4.2 Integration Tests

```python
# tests/test_payment_flow.py

@pytest.mark.asyncio
async def test_complete_payment_flow(client, db_session):
    # 1. Create order
    response = await client.post("/api/v1/orders/checkout", json={
        "shipping_address": {...},
        "contact_info": {...}
    })
    order_id = response.json()["id"]
    
    # 2. Initiate payment
    response = await client.post(f"/api/v1/orders/{order_id}/pay")
    assert response.status_code == 200
    payment_url = response.json()["payment_url"]
    assert "yookassa.ru" in payment_url
    
    # 3. Simulate webhook
    webhook_data = {
        "event": "payment.succeeded",
        "object": {
            "id": "test_payment_id",
            "status": "succeeded",
            "amount": {"value": "100.00", "currency": "RUB"},
            "metadata": {"order_id": str(order_id)}
        }
    }
    
    # Generate valid signature
    body = json.dumps(webhook_data).encode()
    signature = hashlib.sha256(body + settings.YOOKASSA_SECRET_KEY.encode()).hexdigest()
    
    response = await client.post(
        "/api/v1/webhooks/payment/yookassa",
        json=webhook_data,
        headers={"X-Yoomoney-Signature": signature}
    )
    assert response.status_code == 200
    
    # 4. Verify order status
    order = await db_session.get(Order, order_id)
    assert order.status == OrderStatus.PAID
```

#### 4.3 Manual Testing Checklist

- [ ] Create order and initiate payment
- [ ] Complete payment on Yookassa test environment
- [ ] Verify webhook is received and processed
- [ ] Check order status changes to PAID
- [ ] Verify confirmation email is sent
- [ ] Test payment cancellation
- [ ] Test payment expiry
- [ ] Test duplicate webhook (idempotency)
- [ ] Test invalid signature rejection
- [ ] Test payment from unauthorized IP

---

### Phase 5: Production Deployment

#### 5.1 Environment Variables

```env
# Production .env
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_xxx...
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
```

#### 5.2 Monitoring

```python
# Add metrics for payment tracking
from prometheus_client import Counter, Histogram

payment_attempts = Counter('payment_attempts_total', 'Total payment attempts')
payment_successes = Counter('payment_successes_total', 'Successful payments')
payment_failures = Counter('payment_failures_total', 'Failed payments')
payment_duration = Histogram('payment_duration_seconds', 'Payment processing time')
```

#### 5.3 Logging

```python
# Configure structured logging for payments
logger.info(
    "payment_initiated",
    extra={
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
