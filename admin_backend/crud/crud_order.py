from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from backend.models.order import Order, OrderStatus, DeliveryMethod, Payment
from backend.crud.base import CRUDBase
from admin_backend.schemas.order import OrderStatusUpdate
from datetime import datetime


def calculate_final_amount(order: Order) -> int:
    """Calculate final amount including delivery minus discount."""
    return max(0, order.total_amount_cents + (order.delivery_cost_cents or 0) - (order.discount_amount_cents or 0))


class CRUDOrder(CRUDBase[Order, OrderStatusUpdate, OrderStatusUpdate]):
    async def get_multi_with_items(
        self, 
        db: AsyncSession, 
        *, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[OrderStatus] = None,
        delivery_method: Optional[DeliveryMethod] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        user_id: Optional[int] = None,
        min_amount: Optional[int] = None,
        max_amount: Optional[int] = None,
        q: Optional[str] = None,
    ) -> Tuple[List[Order], int]:
        query = select(Order).options(
            selectinload(Order.items),
            selectinload(Order.payments)
        )
        
        # Фильтры
        if status:
            query = query.where(Order.status == status)
        if delivery_method:
            query = query.where(Order.delivery_method == delivery_method)
        if date_from:
            query = query.where(Order.created_at >= date_from)
        if date_to:
            query = query.where(Order.created_at <= date_to)
        if user_id:
            query = query.where(Order.user_id == user_id)
        if min_amount:
            query = query.where(Order.total_amount_cents >= min_amount)
        if max_amount:
            query = query.where(Order.total_amount_cents <= max_amount)
        
        # Поиск по ID, телефону, email
        if q:
            search_conditions = []
            # Поиск по ID (если число)
            if q.isdigit():
                search_conditions.append(Order.id == int(q))
            # Поиск по контактным данным (JSONB)
            search_conditions.append(
                Order.contact_info['phone'].astext.ilike(f"%{q}%")
            )
            search_conditions.append(
                Order.contact_info['email'].astext.ilike(f"%{q}%")
            )
            search_conditions.append(
                Order.tracking_number.ilike(f"%{q}%")
            )
            query = query.where(or_(*search_conditions))
        
        # Подсчёт общего количества
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0
        
        # Пагинация
        query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all(), total

    async def get_with_items(self, db: AsyncSession, id: int) -> Optional[Order]:
        query = select(Order).options(
            selectinload(Order.items),
            selectinload(Order.payments)
        ).where(Order.id == id)
        result = await db.execute(query)
        return result.scalars().first()
    
    async def update_tracking(self, db: AsyncSession, order: Order, tracking_number: str) -> Order:
        order.tracking_number = tracking_number
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order


order = CRUDOrder(Order)
