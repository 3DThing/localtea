# Delivery Systems Integration Plan

## Overview

This document provides a comprehensive plan for integrating delivery providers into LocalTea e-commerce platform.

---

## Recommended Delivery Providers

### Option 1: СДЭК (CDEK) - **RECOMMENDED**

**Pros:**
- ✅ Largest delivery network in Russia
---
# План интеграции служб доставки

## Обзор

Документ содержит подробный план по интеграции служб доставки в e‑commerce платформу LocalTea.

---

## Рекомендуемые поставщики доставки

### Вариант 1: СДЭК — **РЕКОМЕНДУЕМЫЙ**

Преимущества:
- ✅ Крупнейшая сеть доставки по России
- ✅ Надёжное API с хорошей документацией
- ✅ Трекинг в реальном времени
- ✅ Доставка до двери и до пунктов выдачи
- ✅ Конкурентные тарифы
- ✅ Качественная поддержка

Недостатки:
- ⚠️ Необходима регистрация
- ⚠️ Интеграция средней сложности

Документация API: https://api-docs.cdek.ru/

---

### Вариант 2: Boxberry — **АЛЬТЕРНАТИВА**

Преимущества:
- ✅ Широкая сеть пунктов выдачи
- ✅ Простое API
- ✅ Хорошо подходит для небольших посылок
- ✅ Быстрая интеграция

Недостатки:
- ⚠️ Меньшее покрытие по сравнению с СДЭК
- ⚠️ Ограниченные варианты доставки до двери

Документация API: https://api.boxberry.ru/

---

### Вариант 3: Почта России — **РЕЗЕРВ**

Преимущества:
- ✅ Универсальное покрытие (включая удалённые населённые пункты)
- ✅ Низкая стоимость
- ✅ Государственная поддержка

Недостатки:
- ⚠️ Более длительные сроки доставки
- ⚠️ Менее надёжное API
- ⚠️ Ограниченный трекинг

Документация API: https://otpravka.pochta.ru/specification

---

## План реализации

### Фаза 1: Схема БД (1 день)

#### Скрипт миграции

```sql
-- Создать таблицу delivery_methods
CREATE TABLE delivery_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'cdek', 'boxberry', 'russian_post'
    code VARCHAR(50),
    description TEXT,
    base_cost_cents INTEGER NOT NULL,
    cost_per_kg_cents INTEGER,
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Создать таблицу delivery_tracking
CREATE TABLE delivery_tracking (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100),
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_location VARCHAR(200),
    estimated_delivery_date DATE,
    events JSONB,
    last_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(order_id)
);

-- Добавить поля в таблицу orders
ALTER TABLE orders ADD COLUMN delivery_method_id INTEGER REFERENCES delivery_methods(id);
ALTER TABLE orders ADD COLUMN delivery_cost_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN estimated_delivery_date DATE;

-- Индексы
CREATE INDEX idx_delivery_tracking_order_id ON delivery_tracking(order_id);
CREATE INDEX idx_delivery_tracking_tracking_number ON delivery_tracking(tracking_number);
CREATE INDEX idx_orders_delivery_method ON orders(delivery_method_id);

-- Заполнить таблицу методами доставки по умолчанию
INSERT INTO delivery_methods (name, provider, code, description, base_cost_cents, cost_per_kg_cents, estimated_days_min, estimated_days_max) VALUES
('СДЭК Курьер', 'cdek', 'CDEK_COURIER', 'Доставка курьером до двери', 30000, 5000, 2, 5),
('СДЭК Пункт выдачи', 'cdek', 'CDEK_PICKUP', 'Самовывоз из пункта выдачи СДЭК', 20000, 3000, 2, 5),
('Boxberry Пункт выдачи', 'boxberry', 'BOXBERRY_PICKUP', 'Самовывоз из пункта выдачи Boxberry', 18000, 2500, 3, 7),
('Почта России', 'russian_post', 'RUSSIAN_POST', 'Доставка почтой России', 15000, 2000, 7, 14);
```

---

### Фаза 2: Слой сервисов (2–3 дня)

#### Базовый интерфейс провайдера

```python
# backend/services/delivery/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from decimal import Decimal

class DeliveryProvider(ABC):
    """Базовый класс для реализаций провайдеров доставки"""
    
    @abstractmethod
    async def calculate_cost(
        self, 
        from_address: Dict[str, Any],
        to_address: Dict[str, Any],
        weight_kg: float,
        dimensions_cm: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """
        Рассчитать стоимость доставки.

        Args:
            from_address: адрес отправителя
            to_address: адрес получателя
            weight_kg: вес в килограммах
            dimensions_cm: размеры упаковки {length, width, height}

        Returns:
            Словарь с данными о стоимости и сроках
        """
        pass
    
    @abstractmethod
    async def create_shipment(
        self,
        order_id: int,
        delivery_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Создать отправление у провайдера доставки.

        Args:
            order_id: ID заказа
            delivery_data: данные отправления

        Returns:
            Словарь с информацией о созданном отправлении
        """
        pass
    
    @abstractmethod
    async def get_tracking_status(self, tracking_number: str) -> Dict[str, Any]:
        """
        Получить статус трекинга.

        Args:
            tracking_number: трекинг-номер

        Returns:
            Словарь со статусом и событиями
        """
        pass
    
    @abstractmethod
    async def cancel_shipment(self, tracking_number: str) -> bool:
        """Отменить отправление"""
        pass
```

---

### Фаза 3: Реализация провайдера СДЭК (3–5 дней)

#### Сервис для СДЭК

```python
# backend/services/delivery/cdek.py

import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from backend.core.config import settings
from backend.services.delivery.base import DeliveryProvider
import logging

logger = logging.getLogger(__name__)

class CDEKDeliveryProvider(DeliveryProvider):
    """Реализация провайдера СДЭК"""
    
    BASE_URL = "https://api.cdek.ru/v2"
    TEST_BASE_URL = "https://api.edu.cdek.ru/v2"
    
    def __init__(self):
        self.base_url = self.TEST_BASE_URL if settings.DEBUG else self.BASE_URL
        self._token = None
        self._token_expires = None
    
    async def _get_token(self) -> str:
        """Получить OAuth2 токен от СДЭК"""
        if self._token and self._token_expires and datetime.now() < self._token_expires:
            return self._token
        
        # Реализация запроса за токеном (POST к /oauth/token или аналогичный)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                # Детали запроса зависят от спецификации CDEK
            )
            # Обработка ответа и установка self._token, self._token_expires
            return self._token
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Выполнить авторизованный запрос к API СДЭК"""
        token = await self._get_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method, f"{self.base_url}{endpoint}", headers=headers, **kwargs
            )
            return response.json()
    
    async def calculate_cost(
        self,
        from_address: Dict[str, Any],
        to_address: Dict[str, Any],
        weight_kg: float,
        dimensions_cm: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """Рассчитать стоимость доставки через калькулятор тарифов СДЭК"""
        
        # Значения по умолчанию для размеров, если не заданы
        if not dimensions_cm:
            dimensions_cm = {"length": 30, "width": 20, "height": 10}
        
        payload = {
            "type": 1,  # Door to door
            # Формирование полезной нагрузки в соответствии со спецификацией API
        }
        
        data = await self._make_request("POST", "/calculator/tariff", json=payload)
        
        # Выбрать самый дешёвый тариф
        if not data.get("tariff_codes"):
            raise Exception("Нет доступных тарифов")
        
        tariff = min(data["tariff_codes"], key=lambda t: t["delivery_sum"])
        
        return {
            "cost_cents": int(tariff["delivery_sum"] * 100),
            # Другие поля: estimated_days, service_code и т.д.
            "service_code": str(tariff["tariff_code"])
        }
    
    async def create_shipment(
        self,
        order_id: int,
        delivery_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Создать отправление в системе СДЭК"""
        
        payload = {
            "type": 1,  # Online store
            # Формирование данных отправления согласно API
        }
        
        data = await self._make_request("POST", "/orders", json=payload)
        
        return {
            "tracking_number": data["entity"]["uuid"],
            # Дополнительные поля, например cdek_number
            "cdek_number": data["entity"].get("cdek_number")
        }
    
    async def get_tracking_status(self, tracking_number: str) -> Dict[str, Any]:
        """Получить статус отправления"""
        
        data = await self._make_request(
            "GET", 
            f"/orders/{tracking_number}"
        )
        
        entity = data.get("entity", {})
        
        # Пример отображения статусов СДЭК на внутренние статусы
        status_map = {
            "ACCEPTED": "accepted",
            # ... другие соответствия
            "CANCELLED": "cancelled"
        }
        
        return {
            "status": status_map.get(entity.get("status"), "unknown"),
            # Дополнительные данные: events, last_update и т.д.
        }
    
    async def cancel_shipment(self, tracking_number: str) -> bool:
        """Отменить отправление"""
        try:
            await self._make_request(
                "POST", f"/orders/{tracking_number}/cancel"
            )
            return True
        except Exception as e:
            logger.error(f"Не удалось отменить отправление СДЭК {tracking_number}: {e}")
            return False


# Синглтон провайдера
cdek_provider = CDEKDeliveryProvider()
```

---

### Фаза 4: Интеграция сервиса (2–3 дня)

#### Сервис доставки

```python
# backend/services/delivery_service.py

from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.order import Order
from backend.models.delivery import DeliveryMethod, DeliveryTracking
from backend.services.delivery.cdek import cdek_provider
from backend.services.delivery.boxberry import boxberry_provider
from backend.services.delivery.russian_post import russian_post_provider
import logging

logger = logging.getLogger(__name__)

class DeliveryService:
    """Оркестратор доставки: выбирает провайдеров и управляет отправлениями"""
    
    def __init__(self):
        self.providers = {
            "cdek": cdek_provider,
            # другие провайдеры
            "russian_post": russian_post_provider
        }
    
    async def get_available_methods(
        self,
        db: AsyncSession,
        to_address: Dict[str, Any],
        weight_kg: float
    ) -> List[Dict[str, Any]]:
        """
        Получить доступные методы доставки с рассчитанными стоимостями.
        Возвращает список словарей с информацией о методе доставки.
        """
        # Получить активные методы доставки из БД
        stmt = select(DeliveryMethod).where(DeliveryMethod.is_active == True)
        result = await db.execute(stmt)
        methods = result.scalars().all()
        
        available = []
        
        for method in methods:
            try:
                # Вызвать соответствующего провайдера и добавить в available
                pass
            except Exception:
                logger.exception(f"Ошибка при расчёте метода доставки {method.name}")
        
        return sorted(available, key=lambda x: x["cost_cents"])
    
    async def create_shipment(
        self,
        db: AsyncSession,
        order_id: int,
        delivery_method_id: int,
        delivery_data: Dict[str, Any]
    ) -> DeliveryTracking:
        """Создать отправление через выбранного провайдера"""
        
        order = await db.get(Order, order_id)
        if not order:
            raise ValueError(f"Заказ {order_id} не найден")
        
        method = await db.get(DeliveryMethod, delivery_method_id)
        if not method:
            raise ValueError(f"Метод доставки {delivery_method_id} не найден")

        # Вызвать провайдера, сохранить tracking в БД и вернуть запись
        # ... реализация

        return tracking
    
    async def update_tracking_status(self, db: AsyncSession, tracking_id: int) -> DeliveryTracking:
        """Обновить статус трекинга у провайдера"""
        # Получить tracking, вызвать провайдера и обновить запись
        # ... реализация
        return tracking
    
    def _get_warehouse_address(self) -> Dict[str, Any]:
        """Получить адрес склада из настроек"""
        # Сформировать словарь адреса из settings
        return {
            # 'city_code': settings.WAREHOUSE_CITY_CODE, ...
        }


@router.get("/tracking/{tracking_number}", response_model=TrackingResponse)
```

---

### Фаза 5: API-эндпоинты (1–2 дня)

```python
# backend/api/v1/delivery/endpoints.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services import delivery_service
from backend.schemas.delivery import *

router = APIRouter()

@router.post("/calculate", response_model=List[DeliveryMethodResponse])
async def calculate_delivery(
    request: DeliveryCalculateRequest,
    db: AsyncSession = Depends(deps.get_db)
):
    """Рассчитать доступные методы доставки и их стоимость"""
    methods = await delivery_service.get_available_methods(
        db=db,
        to_address=request.to_address,
        weight_kg=request.weight_kg
    )
    return methods

@router.get("/tracking/{tracking_number}", response_model=TrackingResponse)
async def get_tracking(
    tracking_number: str,
    db: AsyncSession = Depends(deps.get_db)
):
    """Получить информацию о трекинге"""
    # Реализация: найти запись в delivery_tracking и/или запросить у провайдера
    pass
```

---

### Фаза 6: Фоновые задания (1–2 дня)

```python
# backend/worker.py

@celery_app.task
def update_delivery_statuses():
    """
    Обновляет статусы всех активных отправлений.
    Планируется запуск каждые 30 минут.
    """
    with sync_session() as db:
        # Получить все активные доставки и обновить их статусы
        pass

# Добавить в beat schedule
celery_app.conf.beat_schedule.update({
    "update-delivery-statuses": {
        "task": "backend.worker.update_delivery_statuses",
        "schedule": 1800.0,  # каждые 30 минут
    }
})
```

---

## Конфигурация

### Переменные окружения

```env
# Конфигурация СДЭК
CDEK_CLIENT_ID=your_client_id
CDEK_CLIENT_SECRET=your_client_secret
CDEK_SHIPMENT_POINT_CODE=MSK123  # Код пункта выдачи
CDEK_FROM_CITY_CODE=44  # Москва
WAREHOUSE_CITY_CODE=44
WAREHOUSE_CITY=Москва
WAREHOUSE_ADDRESS=ул. Примерная, д. 1
WAREHOUSE_POSTAL_CODE=123456

# Информация о компании
COMPANY_NAME=LocalTea
COMPANY_PHONE=+79991234567
COMPANY_ADDRESS=ул. Примерная, д. 1, Москва, 123456
```

---

## Таймлайн

**Итого: 10–15 дней**

| Фаза | Длительность |
|------|--------------|
| Схема БД | 1 день |
| Слой сервисов | 2–3 дня |
| Реализация СДЭК | 3–5 дней |
| Интеграция сервисов | 2–3 дня |
| API-эндпоинты | 1–2 дня |
| Фоновые задания | 1–2 дня |
| Тестирование | 2–3 дня |

---

## Тестирование

### Unit-тесты

```python
# tests/test_delivery.py

@pytest.mark.asyncio
async def test_calculate_delivery_cost():
    from_addr = {"city_code": "44", "city": "Москва"}
    to_addr = {"city_code": "78", "city": "Санкт-Петербург"}
    
    cost = await cdek_provider.calculate_cost(from_addr, to_addr, 1.0)
    
    assert cost["cost_cents"] > 0
    assert cost["estimated_days"] > 0
```

### Интеграционные тесты

```python
@pytest.mark.asyncio
async def test_complete_delivery_flow(db_session):
    # 1. Рассчитать варианты доставки
    methods = await delivery_service.get_available_methods(
        db=db_session,
        to_address={/* данные */},
        weight_kg=0.5
    )
    assert len(methods) > 0
    
    # 2. Создать отправление
    tracking = await delivery_service.create_shipment(
        db=db_session,
        order_id=1,
        delivery_method_id=methods[0]["id"],
        delivery_data={...}
    )
    assert tracking.tracking_number
    
    # 3. Обновить статус
    updated = await delivery_service.update_tracking_status(
        db=db_session,
        tracking_id=tracking.id
    )
    assert updated.status in ['created', 'in_transit', 'delivered']
```

---

## Интеграция с фронтендом

```typescript
// user_frontend/src/app/checkout/delivery/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Radio, Stack, Text, Loader } from '@mantine/core';
import { api } from '@/lib/api';

export default function DeliverySelection() {
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDeliveryMethods();
  }, []);
  
  const loadDeliveryMethods = async () => {
    try {
      // Вызвать API /api/v1/delivery/calculate и установить методы
    } catch (e) {
      console.error(e);
    }
  };
  
  if (loading) return <Loader />;
  
  return (
    <Stack>
      {/* Компонент выбора метода доставки */}
    </Stack>
  );
}
```

---

**Версия документа:** 1.0  
**Последнее обновление:** 7 декабря 2025  
**Автор:** GitHub Copilot
async def get_tracking(
    tracking_number: str,
    db: AsyncSession = Depends(deps.get_db)
):
    """Get delivery tracking information"""
    # Implementation...
    pass
```

---

### Phase 6: Background Jobs (1-2 days)

```python
# backend/worker.py

@celery_app.task
def update_delivery_statuses():
    """
    Update all active delivery statuses.
    Run every 30 minutes.
    """
    with sync_session() as db:
        # Get all active deliveries
        stmt = select(DeliveryTracking).where(
            DeliveryTracking.status.in_(['created', 'in_transit', 'ready_to_ship'])
        )
        result = db.execute(stmt)
        trackings = result.scalars().all()
        
        for tracking in trackings:
            try:
                # Update status
                delivery_service.update_tracking_status(db, tracking.id)
                
                # If delivered, update order status
                if tracking.status == 'delivered':
                    order = db.get(Order, tracking.order_id)
                    if order and order.status != OrderStatus.DELIVERED:
                        order.status = OrderStatus.DELIVERED
                        order.delivered_at = datetime.now(timezone.utc)
                        db.commit()
                        
                        # Send notification
                        logger.info(f"Order {order.id} delivered")
            
            except Exception as e:
                logger.error(f"Failed to update tracking {tracking.id}: {e}")
                continue

# Add to beat schedule
celery_app.conf.beat_schedule.update({
    "update-delivery-statuses": {
        "task": "backend.worker.update_delivery_statuses",
        "schedule": 1800.0,  # Every 30 minutes
    }
})
```

---

## Configuration

### Environment Variables

```env
# CDEK Configuration
CDEK_CLIENT_ID=your_client_id
CDEK_CLIENT_SECRET=your_client_secret
CDEK_SHIPMENT_POINT_CODE=MSK123  # Your pickup point
CDEK_FROM_CITY_CODE=44  # Moscow
WAREHOUSE_CITY_CODE=44
WAREHOUSE_CITY=Москва
WAREHOUSE_ADDRESS=ул. Примерная, д. 1
WAREHOUSE_POSTAL_CODE=123456

# Company Information
COMPANY_NAME=LocalTea
COMPANY_PHONE=+79991234567
COMPANY_ADDRESS=ул. Примерная, д. 1, Москва, 123456
```

---

## Timeline

**Total: 10-15 days**

| Phase | Duration |
|-------|----------|
| Database Schema | 1 day |
| Service Layer | 2-3 days |
| CDEK Implementation | 3-5 days |
| Service Integration | 2-3 days |
| API Endpoints | 1-2 days |
| Background Jobs | 1-2 days |
| Testing | 2-3 days |

---

## Testing

### Unit Tests

```python
# tests/test_delivery.py

@pytest.mark.asyncio
async def test_calculate_delivery_cost():
    from_addr = {"city_code": "44", "city": "Москва"}
    to_addr = {"city_code": "78", "city": "Санкт-Петербург"}
    
    cost = await cdek_provider.calculate_cost(from_addr, to_addr, 1.0)
    
    assert cost["cost_cents"] > 0
    assert cost["estimated_days"] > 0
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_complete_delivery_flow(db_session):
    # 1. Calculate delivery options
    methods = await delivery_service.get_available_methods(
        db=db_session,
        to_address={"city": "Москва", "city_code": "44"},
        weight_kg=0.5
    )
    assert len(methods) > 0
    
    # 2. Create shipment
    tracking = await delivery_service.create_shipment(
        db=db_session,
        order_id=123,
        delivery_method_id=methods[0]["id"],
        delivery_data={...}
    )
    assert tracking.tracking_number
    
    # 3. Update status
    updated = await delivery_service.update_tracking_status(
        db=db_session,
        tracking_id=tracking.id
    )
    assert updated.status in ['created', 'in_transit', 'delivered']
```

---

## Frontend Integration

```typescript
// user_frontend/src/app/checkout/delivery/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Radio, Stack, Text, Loader } from '@mantine/core';
import { api } from '@/lib/api';

export default function DeliverySelection() {
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDeliveryMethods();
  }, []);
  
  const loadDeliveryMethods = async () => {
    try {
      const response = await api.post('/api/v1/delivery/calculate', {
        to_address: {
          city: 'Москва',
          city_code: '44'
        },
        weight_kg: 0.5
      });
      setMethods(response.data);
      if (response.data.length > 0) {
        setSelected(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load delivery methods:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <Loader />;
  
  return (
    <Stack>
      <Text size="lg" fw={600}>Выберите способ доставки</Text>
      
      <Radio.Group value={selected} onChange={setSelected}>
        <Stack>
          {methods.map((method) => (
            <Radio
              key={method.id}
              value={method.id}
              label={
                <div>
                  <Text fw={500}>{method.name}</Text>
                  <Text size="sm" c="dimmed">{method.description}</Text>
                  <Text size="sm">
                    {method.cost_cents / 100} ₽ • {method.estimated_days} дней
                  </Text>
                </div>
              }
            />
          ))}
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
```

---

**Document Version:** 1.0  
**Last Updated:** December 7, 2025  
**Author:** GitHub Copilot
