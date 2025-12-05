from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.user import User
from backend.models.order import OrderStatus
from admin_backend.core.deps import get_current_admin
from admin_backend.crud import crud_order
from admin_backend.schemas import order as schemas
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()

@router.get("/", response_model=List[schemas.OrderAdminResponse])
async def read_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[OrderStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return await crud_order.order.get_multi_with_items(db, skip=skip, limit=limit, status=status)

@router.get("/{id}", response_model=schemas.OrderAdminResponse)
async def read_order(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.patch("/{id}/status", response_model=schemas.OrderAdminResponse)
async def update_order_status(
    id: int,
    status_update: schemas.OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # TODO: Add logic for status transitions (e.g. can't go from Cancelled to Paid)
    # TODO: Send email notification on status change
    
    order.status = status_update.status
    db.add(order)
    await db.commit()
    # Re-fetch to ensure items are loaded for response model
    order = await crud_order.order.get_with_items(db, id=id)
    await log_admin_action(db, current_user.id, "update", "order", order.id, f"Updated order status to {status_update.status}")
    return order

@router.post("/{id}/cancel", response_model=schemas.OrderAdminResponse)
async def cancel_order(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = OrderStatus.CANCELLED
    db.add(order)
    await db.commit()
    # Re-fetch to ensure items are loaded for response model
    order = await crud_order.order.get_with_items(db, id=id)
    await log_admin_action(db, current_user.id, "update", "order", order.id, "Cancelled order")
    return order
