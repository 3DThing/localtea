# USER_BACKEND — Платежная система YooKassa

## Обзор архитектуры

```
┌─────────────────────────────────────────────────┐
│            Frontend (Next.js)                   │
│  /payment/success, profile /orders              │
└────────────────────┬────────────────────────────┘
                     │ 1. GET /orders/{id}
                     ↓
┌─────────────────────────────────────────────────┐
│      Backend (FastAPI)                          │
│  endpoints: /orders/{id}, /checkout             │
└────────────────────┬────────────────────────────┘
                     │ 2. Create/Get payment
                     ↓
┌─────────────────────────────────────────────────┐
│      YooKassa API                               │
│  (payment.yookassa.ru)                          │
└────────────────────┬────────────────────────────┘
                     │ 3. Webhook notification
                     ↓
┌─────────────────────────────────────────────────┐
│  Backend /webhooks/payment/yookassa             │
│  Update order status                            │
└─────────────────────────────────────────────────┘
```

---

## Сервис платежей

**Расположение**: `backend/services/payment/yookassa.py`

### YooKassaService

```python
class YooKassaService:
    """Сервис для работы с YooKassa API"""
    
    def __init__(self, shop_id: str, api_key: str):
        self.shop_id = shop_id
        self.api_key = api_key
        self.base_url = "https://api.yookassa.ru/v3"
    
    async def create_payment(
        self,
        amount_cents: int,
        description: str,
        order_id: int,
        customer_email: str,
        return_url: str,
        notification_url: str,
    ) -> dict:
        """
        Создаёт платёж в YooKassa
        
        Args:
            amount_cents: Сумма в копейках
            description: Описание платежа (e.g., "Заказ #123")
            order_id: ID заказа
            customer_email: Email клиента
            return_url: URL для редиректа после оплаты
            notification_url: URL для webhook-уведомлений
        
        Returns:
            {
                'id': 'yookassa_payment_id',
                'confirmation': {
                    'confirmation_url': 'https://payment.yookassa.ru/...'
                }
            }
        """
        payment_data = {
            "amount": {
                "value": amount_cents / 100,  # В рублях
                "currency": "RUB"
            },
            "payment_method_data": {
                "type": "payment_card"
            },
            "confirmation": {
                "type": "redirect",
                "return_url": return_url
            },
            "description": description,
            "metadata": {
                "order_id": str(order_id),
                "customer_email": customer_email
            },
            "notification_url": notification_url
        }
        
        response = await self.http_client.post(
            f"{self.base_url}/payments",
            json=payment_data,
            auth=(self.shop_id, self.api_key),
            headers={"Idempotency-Key": str(uuid4())}
        )
        
        return response.json()
    
    async def get_payment(self, payment_id: str) -> dict:
        """
        Получает статус платежа из YooKassa
        
        Args:
            payment_id: ID платежа в YooKassa
        
        Returns:
            {
                'id': 'payment_id',
                'status': 'succeeded|pending|canceled',
                'amount': {'value': '100.00', 'currency': 'RUB'}
            }
        """
        response = await self.http_client.get(
            f"{self.base_url}/payments/{payment_id}",
            auth=(self.shop_id, self.api_key)
        )
        
        return response.json()
    
    def verify_webhook_signature(
        self,
        request_body: bytes,
        signature: str
    ) -> bool:
        """
        Проверяет подпись webhook от YooKassa
        
        Args:
            request_body: Тело запроса
            signature: Заголовок X-Yookassa-CA-Cert-Thumbprint
        
        Returns:
            True если подпись верна
        """
        expected = hashlib.sha256(
            request_body + self.api_key.encode()
        ).hexdigest()
        
        return hmac.compare_digest(expected, signature)
```

---

## Работа с заказами и платежами

**Расположение**: `backend/services/order.py`

### Методы

#### create_yookassa_payment

```python
async def create_yookassa_payment(
    session: AsyncSession,
    order: Order
) -> str:
    """
    Создаёт платёж в YooKassa для заказа
    
    Returns:
        Ссылка на оплату (confirmation_url)
    """
    yookassa = YooKassaService(
        shop_id=settings.YOOKASSA_SHOP_ID,
        api_key=settings.YOOKASSA_API_KEY
    )
    
    # Получить пользователя
    user = await session.get(User, order.user_id)
    
    # Создать платёж
    payment = await yookassa.create_payment(
        amount_cents=order.total_price_cents,
        description=f"Заказ #{order.id}",
        order_id=order.id,
        customer_email=user.email,
        return_url=settings.YOOKASSA_RETURN_URL,
        notification_url=settings.YOOKASSA_WEBHOOK_URL
    )
    
    # Сохранить ID платежа в заказ
    order.yookassa_payment_id = payment['id']
    order.yookassa_payment_url = payment['confirmation']['confirmation_url']
    await session.commit()
    
    return payment['confirmation']['confirmation_url']
```

#### check_and_update_order_status

```python
async def check_and_update_order_status(
    session: AsyncSession,
    order: Order
) -> None:
    """
    Проверяет статус платежа в YooKassa и обновляет статус заказа
    """
    if not order.yookassa_payment_id:
        return
    
    yookassa = YooKassaService(
        shop_id=settings.YOOKASSA_SHOP_ID,
        api_key=settings.YOOKASSA_API_KEY
    )
    
    try:
        # Получить статус платежа
        payment = await yookassa.get_payment(order.yookassa_payment_id)
        
        if payment['status'] == 'succeeded':
            # Обновить статус заказа
            order.status = OrderStatus.PAID
            order.paid_at = datetime.utcnow()
            
            # Отправить email подтверждение
            await send_order_paid_email(order)
            
            await session.commit()
        
        elif payment['status'] == 'canceled':
            # Платёж отменён, создать новый
            await create_yookassa_payment(session, order)
        
        elif payment['status'] == 'expired':
            # Платёж истёк, создать новый
            await create_yookassa_payment(session, order)
    
    except YooKassaError as e:
        logger.error(f"YooKassa error for order {order.id}: {e}")
        # Создать новый платёж при ошибке
        await create_yookassa_payment(session, order)
```

#### get_payment_url

```python
async def get_payment_url(
    session: AsyncSession,
    order: Order
) -> str:
    """
    Возвращает существующий payment_url или создаёт новый
    """
    if order.yookassa_payment_url:
        # Проверить, не истёк ли платёж
        try:
            yookassa = YooKassaService(...)
            payment = await yookassa.get_payment(order.yookassa_payment_id)
            
            if payment['status'] in ['pending', 'waiting_for_capture']:
                return order.yookassa_payment_url
        except:
            pass
    
    # Создать новый платёж
    return await create_yookassa_payment(session, order)
```

---

## API Endpoints

### GET /api/v1/orders/{order_id}

```python
@router.get("/{order_id}", response_model=OrderDetailSchema)
async def get_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Получить деталь заказа с автопроверкой платежа
    """
    # 1. Получить заказ
    order = await session.get(Order, order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # 2. Если статус AWAITING_PAYMENT, проверить в YooKassa
    if order.status == OrderStatus.AWAITING_PAYMENT:
        await check_and_update_order_status(session, order)
    
    # 3. Если всё ещё AWAITING_PAYMENT, вернуть payment_url
    if order.status == OrderStatus.AWAITING_PAYMENT:
        payment_url = await get_payment_url(session, order)
        return OrderDetailSchema.from_orm(order, payment_url=payment_url)
    
    return OrderDetailSchema.from_orm(order)
```

### POST /api/v1/checkout

```python
@router.post("/checkout", response_model=CheckoutResponseSchema)
async def checkout(
    checkout_data: CheckoutSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Создание заказа и платежа
    """
    # 1. Валидировать и создать заказ
    order = await create_order(
        session=session,
        user_id=current_user.id,
        items=checkout_data.items,
        delivery_method=checkout_data.delivery_method,
        delivery_data=checkout_data.delivery_data
    )
    
    # 2. Рассчитать доставку
    delivery_cost = await calculate_delivery(
        order.delivery_method,
        order.postal_code
    )
    
    # 3. Создать платёж
    payment_url = await create_yookassa_payment(session, order)
    
    return CheckoutResponseSchema(
        order_id=order.id,
        total_price_cents=order.total_price_cents,
        payment_url=payment_url
    )
```

### POST /api/v1/webhooks/payment/yookassa

```python
@router.post("/payment/yookassa")
async def yookassa_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """
    Webhook от YooKassa о статусе платежа
    """
    # 1. Получить body и подпись
    body = await request.body()
    signature = request.headers.get('X-Yookassa-CA-Cert-Thumbprint')
    
    # 2. Проверить подпись
    yookassa = YooKassaService(...)
    if not yookassa.verify_webhook_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # 3. Парсить webhook
    data = await request.json()
    
    if data['event'] != 'payment.succeeded':
        return {'status': 'ok'}
    
    # 4. Получить заказ по metadata
    payment_id = data['object']['id']
    order_id = int(data['object']['metadata']['order_id'])
    
    # 5. Обновить статус заказа
    order = await session.get(Order, order_id)
    if order and order.yookassa_payment_id == payment_id:
        order.status = OrderStatus.PAID
        order.paid_at = datetime.utcnow()
        await session.commit()
        
        # 6. Отправить email
        await send_order_paid_email(order)
    
    return {'status': 'ok'}
```

---

## Модель заказа

**Расположение**: `backend/models/order.py`

```python
class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    
    # Платёжные данные
    yookassa_payment_id = Column(String, nullable=True, unique=True)
    yookassa_payment_url = Column(String, nullable=True)
    total_price_cents = Column(Integer)  # В копейках
    
    # Статус и даты
    status = Column(
        Enum(OrderStatus),
        default=OrderStatus.AWAITING_PAYMENT
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    
    # Доставка
    delivery_method = Column(String)
    delivery_cost_cents = Column(Integer, default=0)
    tracking_number = Column(String, nullable=True)
    
    # Адрес доставки
    address = Column(String)
    postal_code = Column(String)
    phone = Column(String)
```

---

## Конфигурация

**Расположение**: `backend/core/config.py`

```python
class Settings(BaseSettings):
    # YooKassa
    YOOKASSA_SHOP_ID: str = os.getenv("YOOKASSA_SHOP_ID")
    YOOKASSA_API_KEY: str = os.getenv("YOOKASSA_API_KEY")
    YOOKASSA_RETURN_URL: str = "https://localtea.ru/payment/success"
    YOOKASSA_WEBHOOK_URL: str = "https://api.localtea.ru/api/v1/webhooks/payment/yookassa"
    
    # Email для отправки уведомлений
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USER: str
    SMTP_PASSWORD: str
```

---

## Переменные окружения

```bash
# .env
YOOKASSA_SHOP_ID=123456
YOOKASSA_API_KEY=live_abcdef123456...
YOOKASSA_RETURN_URL=https://localtea.ru/payment/success
YOOKASSA_WEBHOOK_URL=https://api.localtea.ru/api/v1/webhooks/payment/yookassa

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@localtea.ru
SMTP_PASSWORD=app_password
```

---

## Обработка ошибок

### Исключения

```python
class YooKassaError(Exception):
    """Ошибка YooKassa API"""
    pass

class PaymentExpiredError(YooKassaError):
    """Платёж истёк"""
    pass

class PaymentCanceledError(YooKassaError):
    """Платёж отменён пользователем"""
    pass
```

### Обработка в эндпоинте

```python
try:
    payment_url = await get_payment_url(session, order)
except PaymentExpiredError:
    # Автоматически создан новый платёж
    payment_url = order.yookassa_payment_url
except YooKassaError as e:
    raise HTTPException(status_code=503, detail="Payment service unavailable")
```

---

## Логирование

```python
import logging

logger = logging.getLogger(__name__)

# При создании платежа
logger.info(f"Creating payment for order {order.id}, amount: {order.total_price_cents}")

# При webhook
logger.info(f"Payment webhook received: {payment_id}, status: {payment['status']}")

# При ошибке
logger.error(f"YooKassa API error: {e}", exc_info=True)
```

---

## Тестирование

### Unit тест создания платежа

```python
async def test_create_yookassa_payment(session, order):
    """Тест создания платежа"""
    payment_url = await create_yookassa_payment(session, order)
    
    assert payment_url
    assert order.yookassa_payment_id
    assert "payment.yookassa.ru" in payment_url
```

### Integration тест webhook

```python
async def test_yookassa_webhook(client, order):
    """Тест webhook уведомления"""
    response = await client.post(
        "/api/v1/webhooks/payment/yookassa",
        json={
            "event": "payment.succeeded",
            "object": {
                "id": "payment_123",
                "status": "succeeded",
                "metadata": {
                    "order_id": str(order.id)
                }
            }
        },
        headers={
            "X-Yookassa-CA-Cert-Thumbprint": "valid_signature"
        }
    )
    
    assert response.status_code == 200
    
    # Проверить, что статус заказа обновлён
    updated_order = await session.get(Order, order.id)
    assert updated_order.status == OrderStatus.PAID
```

---

## Production Checklist

- [ ] Добавить YOOKASSA_SHOP_ID и YOOKASSA_API_KEY в .env
- [ ] Создать SSL сертификат для webhook URL
- [ ] Настроить webhook-уведомления в YooKassa Dashboard
- [ ] Настроить email-уведомления об успешной оплате
- [ ] Включить логирование платежей
- [ ] Настроить мониторинг webhook'ов
- [ ] Добавить retry-logic для webhook-уведомлений
- [ ] Настроить alerts при ошибках платежей
