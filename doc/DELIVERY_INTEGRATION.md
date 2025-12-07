# Delivery Systems Integration Plan

## Overview

This document provides a comprehensive plan for integrating delivery providers into LocalTea e-commerce platform.

---

## Recommended Delivery Providers

### Option 1: СДЭК (CDEK) - **RECOMMENDED**

**Pros:**
- ✅ Largest delivery network in Russia
- ✅ Reliable API with good documentation
- ✅ Real-time tracking
- ✅ Door-to-door and pickup point delivery
- ✅ Competitive pricing
- ✅ Good customer support

**Cons:**
- ⚠️ Registration process required
- ⚠️ Integration complexity (medium)

**API Documentation:** https://api-docs.cdek.ru/

---

### Option 2: Boxberry - **ALTERNATIVE**

**Pros:**
- ✅ Wide pickup point network
- ✅ Simple API
- ✅ Good for small parcels
- ✅ Fast integration

**Cons:**
- ⚠️ Smaller coverage than CDEK
- ⚠️ Limited door-to-door options

**API Documentation:** https://api.boxberry.ru/

---

### Option 3: Почта России (Russian Post) - **BACKUP**

**Pros:**
- ✅ Universal coverage (even remote areas)
- ✅ Lowest cost
- ✅ Government-backed

**Cons:**
- ⚠️ Longer delivery times
- ⚠️ Less reliable API
- ⚠️ Limited tracking

**API Documentation:** https://otpravka.pochta.ru/specification

---

## Implementation Plan

### Phase 1: Database Schema (1 day)

#### Migration Script

```sql
-- Create delivery_methods table
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

-- Create delivery_tracking table
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

-- Add delivery fields to orders table
ALTER TABLE orders ADD COLUMN delivery_method_id INTEGER REFERENCES delivery_methods(id);
ALTER TABLE orders ADD COLUMN delivery_cost_cents INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN estimated_delivery_date DATE;

-- Create indexes
CREATE INDEX idx_delivery_tracking_order_id ON delivery_tracking(order_id);
CREATE INDEX idx_delivery_tracking_tracking_number ON delivery_tracking(tracking_number);
CREATE INDEX idx_orders_delivery_method ON orders(delivery_method_id);

-- Insert default delivery methods
INSERT INTO delivery_methods (name, provider, code, description, base_cost_cents, cost_per_kg_cents, estimated_days_min, estimated_days_max) VALUES
('СДЭК Курьер', 'cdek', 'CDEK_COURIER', 'Доставка курьером до двери', 30000, 5000, 2, 5),
('СДЭК Пункт выдачи', 'cdek', 'CDEK_PICKUP', 'Самовывоз из пункта выдачи СДЭК', 20000, 3000, 2, 5),
('Boxberry Пункт выдачи', 'boxberry', 'BOXBERRY_PICKUP', 'Самовывоз из пункта выдачи Boxberry', 18000, 2500, 3, 7),
('Почта России', 'russian_post', 'RUSSIAN_POST', 'Доставка почтой России', 15000, 2000, 7, 14);
```

---

### Phase 2: Service Layer (2-3 days)

#### Base Provider Interface

```python
# backend/services/delivery/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from decimal import Decimal

class DeliveryProvider(ABC):
    """Base class for delivery providers"""
    
    @abstractmethod
    async def calculate_cost(
        self, 
        from_address: Dict[str, Any],
        to_address: Dict[str, Any],
        weight_kg: float,
        dimensions_cm: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """
        Calculate delivery cost.
        
        Args:
            from_address: Sender address
            to_address: Recipient address
            weight_kg: Package weight in kg
            dimensions_cm: Package dimensions {length, width, height}
        
        Returns:
            {
                "cost_cents": int,
                "estimated_days": int,
                "service_code": str
            }
        """
        pass
    
    @abstractmethod
    async def create_shipment(
        self,
        order_id: int,
        delivery_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create shipment with delivery provider.
        
        Args:
            order_id: Order ID
            delivery_data: Shipment details
        
        Returns:
            {
                "tracking_number": str,
                "shipment_id": str,
                "label_url": str (optional)
            }
        """
        pass
    
    @abstractmethod
    async def get_tracking_status(self, tracking_number: str) -> Dict[str, Any]:
        """
        Get tracking status.
        
        Args:
            tracking_number: Tracking number
        
        Returns:
            {
                "status": str,
                "current_location": str,
                "estimated_delivery": str (ISO date),
                "events": List[Dict]
            }
        """
        pass
    
    @abstractmethod
    async def cancel_shipment(self, tracking_number: str) -> bool:
        """Cancel shipment"""
        pass
```

---

### Phase 3: CDEK Provider Implementation (3-5 days)

#### CDEK Service

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
    """CDEK delivery provider implementation"""
    
    BASE_URL = "https://api.cdek.ru/v2"
    TEST_BASE_URL = "https://api.edu.cdek.ru/v2"
    
    def __init__(self):
        self.base_url = self.TEST_BASE_URL if settings.DEBUG else self.BASE_URL
        self._token = None
        self._token_expires = None
    
    async def _get_token(self) -> str:
        """Get OAuth2 token from CDEK"""
        if self._token and self._token_expires and datetime.now() < self._token_expires:
            return self._token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/oauth/token",
                params={
                    "grant_type": "client_credentials",
                    "client_id": settings.CDEK_CLIENT_ID,
                    "client_secret": settings.CDEK_CLIENT_SECRET
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get CDEK token: {response.text}")
            
            data = response.json()
            self._token = data["access_token"]
            self._token_expires = datetime.now() + timedelta(seconds=data["expires_in"] - 60)
            
            return self._token
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated request to CDEK API"""
        token = await self._get_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.base_url}{endpoint}",
                headers=headers,
                **kwargs
            )
            
            if response.status_code not in (200, 201):
                logger.error(f"CDEK API error: {response.text}")
                raise Exception(f"CDEK API error: {response.status_code}")
            
            return response.json()
    
    async def calculate_cost(
        self,
        from_address: Dict[str, Any],
        to_address: Dict[str, Any],
        weight_kg: float,
        dimensions_cm: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """Calculate delivery cost using CDEK tariff calculator"""
        
        # Default dimensions if not provided
        if not dimensions_cm:
            dimensions_cm = {"length": 30, "width": 20, "height": 10}
        
        payload = {
            "type": 1,  # Door to door
            "currency": "RUB",
            "from_location": {
                "code": from_address.get("city_code"),
                "city": from_address.get("city"),
                "postal_code": from_address.get("postal_code")
            },
            "to_location": {
                "code": to_address.get("city_code"),
                "city": to_address.get("city"),
                "postal_code": to_address.get("postal_code")
            },
            "packages": [{
                "weight": int(weight_kg * 1000),  # grams
                "length": dimensions_cm["length"],
                "width": dimensions_cm["width"],
                "height": dimensions_cm["height"]
            }]
        }
        
        data = await self._make_request("POST", "/calculator/tariff", json=payload)
        
        # Find cheapest tariff
        if not data.get("tariff_codes"):
            raise Exception("No available tariffs")
        
        tariff = min(data["tariff_codes"], key=lambda t: t["delivery_sum"])
        
        return {
            "cost_cents": int(tariff["delivery_sum"] * 100),
            "estimated_days": tariff["period_min"],
            "service_code": str(tariff["tariff_code"])
        }
    
    async def create_shipment(
        self,
        order_id: int,
        delivery_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create shipment in CDEK system"""
        
        payload = {
            "type": 1,  # Online store
            "number": f"ORDER-{order_id}",
            "tariff_code": delivery_data.get("tariff_code", 1),  # Default: Door to door
            "comment": delivery_data.get("comment", ""),
            "shipment_point": settings.CDEK_SHIPMENT_POINT_CODE,
            "delivery_point": delivery_data.get("delivery_point_code"),
            "sender": {
                "name": settings.COMPANY_NAME,
                "phones": [{
                    "number": settings.COMPANY_PHONE
                }]
            },
            "recipient": {
                "name": delivery_data["recipient_name"],
                "phones": [{
                    "number": delivery_data["recipient_phone"]
                }],
                "email": delivery_data.get("recipient_email")
            },
            "from_location": {
                "code": settings.CDEK_FROM_CITY_CODE,
                "address": settings.COMPANY_ADDRESS
            },
            "to_location": {
                "code": delivery_data.get("city_code"),
                "address": delivery_data.get("address")
            },
            "packages": [{
                "number": f"PKG-{order_id}-1",
                "weight": delivery_data.get("weight_kg", 0.5) * 1000,
                "length": 30,
                "width": 20,
                "height": 10,
                "items": [{
                    "name": item["name"],
                    "ware_key": str(item["sku_id"]),
                    "payment": {"value": 0},  # Prepaid
                    "cost": item["price_cents"] / 100,
                    "weight": item.get("weight_g", 100),
                    "amount": item["quantity"]
                } for item in delivery_data.get("items", [])]
            }]
        }
        
        data = await self._make_request("POST", "/orders", json=payload)
        
        return {
            "tracking_number": data["entity"]["uuid"],
            "shipment_id": data["entity"]["uuid"],
            "cdek_number": data["entity"].get("cdek_number")
        }
    
    async def get_tracking_status(self, tracking_number: str) -> Dict[str, Any]:
        """Get shipment tracking status"""
        
        data = await self._make_request(
            "GET", 
            f"/orders/{tracking_number}"
        )
        
        entity = data["entity"]
        
        # Map CDEK statuses to our statuses
        status_map = {
            "ACCEPTED": "accepted",
            "CREATED": "created",
            "READY_TO_SHIP": "ready_to_ship",
            "DELIVERING": "in_transit",
            "DELIVERED": "delivered",
            "CANCELLED": "cancelled"
        }
        
        return {
            "status": status_map.get(entity["status"], "unknown"),
            "current_location": entity.get("location", {}).get("address"),
            "estimated_delivery": entity.get("delivery_date"),
            "events": [
                {
                    "date": event["date_time"],
                    "status": event["code"],
                    "description": event["name"],
                    "location": event.get("city")
                }
                for event in entity.get("statuses", [])
            ]
        }
    
    async def cancel_shipment(self, tracking_number: str) -> bool:
        """Cancel shipment"""
        try:
            await self._make_request(
                "DELETE",
                f"/orders/{tracking_number}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to cancel CDEK shipment {tracking_number}: {e}")
            return False


# Singleton instance
cdek_provider = CDEKDeliveryProvider()
```

---

### Phase 4: Service Integration (2-3 days)

#### Delivery Service

```python
# backend/services/delivery_service.py

from typing import Dict, Any, Optional
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
    """Main delivery service orchestrator"""
    
    def __init__(self):
        self.providers = {
            "cdek": cdek_provider,
            "boxberry": boxberry_provider,
            "russian_post": russian_post_provider
        }
    
    async def get_available_methods(
        self,
        db: AsyncSession,
        to_address: Dict[str, Any],
        weight_kg: float
    ) -> List[Dict[str, Any]]:
        """
        Get available delivery methods with calculated costs.
        
        Returns:
            [{
                "id": int,
                "name": str,
                "provider": str,
                "cost_cents": int,
                "estimated_days": int
            }]
        """
        # Get active delivery methods
        stmt = select(DeliveryMethod).where(DeliveryMethod.is_active == True)
        result = await db.execute(stmt)
        methods = result.scalars().all()
        
        available = []
        
        for method in methods:
            try:
                provider = self.providers.get(method.provider)
                if not provider:
                    continue
                
                # Calculate cost for this method
                cost_data = await provider.calculate_cost(
                    from_address=self._get_warehouse_address(),
                    to_address=to_address,
                    weight_kg=weight_kg
                )
                
                available.append({
                    "id": method.id,
                    "name": method.name,
                    "provider": method.provider,
                    "cost_cents": cost_data["cost_cents"],
                    "estimated_days": cost_data["estimated_days"],
                    "description": method.description
                })
            except Exception as e:
                logger.error(f"Failed to calculate cost for {method.name}: {e}")
                continue
        
        return sorted(available, key=lambda x: x["cost_cents"])
    
    async def create_shipment(
        self,
        db: AsyncSession,
        order_id: int,
        delivery_method_id: int,
        delivery_data: Dict[str, Any]
    ) -> DeliveryTracking:
        """Create shipment with delivery provider"""
        
        # Get order
        order = await db.get(Order, order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Get delivery method
        method = await db.get(DeliveryMethod, delivery_method_id)
        if not method:
            raise ValueError(f"Delivery method {delivery_method_id} not found")
        
        # Get provider
        provider = self.providers.get(method.provider)
        if not provider:
            raise ValueError(f"Provider {method.provider} not found")
        
        # Create shipment
        shipment_data = await provider.create_shipment(order_id, delivery_data)
        
        # Create tracking record
        tracking = DeliveryTracking(
            order_id=order_id,
            tracking_number=shipment_data["tracking_number"],
            provider=method.provider,
            status="created",
            events={"shipment_data": shipment_data}
        )
        db.add(tracking)
        await db.commit()
        await db.refresh(tracking)
        
        return tracking
    
    async def update_tracking_status(
        self,
        db: AsyncSession,
        tracking_id: int
    ) -> DeliveryTracking:
        """Update tracking status from provider"""
        
        tracking = await db.get(DeliveryTracking, tracking_id)
        if not tracking:
            raise ValueError(f"Tracking {tracking_id} not found")
        
        provider = self.providers.get(tracking.provider)
        if not provider:
            raise ValueError(f"Provider {tracking.provider} not found")
        
        # Get status from provider
        status_data = await provider.get_tracking_status(tracking.tracking_number)
        
        # Update tracking
        tracking.status = status_data["status"]
        tracking.current_location = status_data.get("current_location")
        tracking.estimated_delivery_date = status_data.get("estimated_delivery")
        tracking.events = status_data.get("events", [])
        tracking.last_update = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(tracking)
        
        return tracking
    
    def _get_warehouse_address(self) -> Dict[str, Any]:
        """Get warehouse address from settings"""
        return {
            "city_code": settings.WAREHOUSE_CITY_CODE,
            "city": settings.WAREHOUSE_CITY,
            "address": settings.WAREHOUSE_ADDRESS,
            "postal_code": settings.WAREHOUSE_POSTAL_CODE
        }


delivery_service = DeliveryService()
```

---

### Phase 5: API Endpoints (1-2 days)

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
    """Calculate available delivery methods and costs"""
    methods = await delivery_service.get_available_methods(
        db=db,
        to_address=request.to_address.dict(),
        weight_kg=request.weight_kg
    )
    return methods

@router.get("/tracking/{tracking_number}", response_model=TrackingResponse)
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
