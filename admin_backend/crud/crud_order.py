from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.models.order import Order, OrderStatus
from backend.crud.base import CRUDBase
from admin_backend.schemas.order import OrderStatusUpdate

class CRUDOrder(CRUDBase[Order, OrderStatusUpdate, OrderStatusUpdate]):
    async def get_multi_with_items(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, status: Optional[OrderStatus] = None
    ) -> List[Order]:
        query = select(Order).options(selectinload(Order.items))
        if status:
            query = query.where(Order.status == status)
        query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_with_items(self, db: AsyncSession, id: int) -> Optional[Order]:
        query = select(Order).options(selectinload(Order.items)).where(Order.id == id)
        result = await db.execute(query)
        return result.scalars().first()

order = CRUDOrder(Order)
