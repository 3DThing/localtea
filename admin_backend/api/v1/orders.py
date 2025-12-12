from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime
from backend.db.session import get_db
from backend.models.user import User
from backend.models.order import OrderStatus, DeliveryMethod, Order, Payment
from admin_backend.core.deps import get_current_admin
from admin_backend.crud import crud_order
from admin_backend.crud.crud_order import calculate_final_amount
from admin_backend.crud.crud_finance import finance as crud_finance
from admin_backend.schemas import order as schemas
from admin_backend.schemas.order import VALID_STATUS_TRANSITIONS
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()


def validate_status_transition(current_status: OrderStatus, new_status: OrderStatus) -> bool:
    """Проверяет допустимость перехода между статусами."""
    allowed = VALID_STATUS_TRANSITIONS.get(current_status, [])
    return new_status in allowed


@router.get("/", response_model=schemas.OrderListResponse)
async def read_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[OrderStatus] = None,
    delivery_method: Optional[DeliveryMethod] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    user_id: Optional[int] = None,
    min_amount: Optional[int] = Query(None, ge=0),
    max_amount: Optional[int] = Query(None, ge=0),
    q: Optional[str] = Query(None, min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Получить список заказов с фильтрацией и поиском.
    
    - **status**: фильтр по статусу
    - **delivery_method**: фильтр по способу доставки
    - **date_from/date_to**: фильтр по дате создания
    - **user_id**: фильтр по пользователю
    - **min_amount/max_amount**: фильтр по сумме (в копейках)
    - **q**: поиск по ID заказа, телефону, email или трек-номеру
    """
    orders, total = await crud_order.order.get_multi_with_items(
        db, 
        skip=skip, 
        limit=limit, 
        status=status,
        delivery_method=delivery_method,
        date_from=date_from,
        date_to=date_to,
        user_id=user_id,
        min_amount=min_amount,
        max_amount=max_amount,
        q=q,
    )
    
    # Add final_amount_cents to each order
    items = []
    for order in orders:
        order_dict = schemas.OrderAdminResponse.model_validate(order).model_dump()
        order_dict['final_amount_cents'] = calculate_final_amount(order)
        items.append(schemas.OrderAdminResponse(**order_dict))
    
    return schemas.OrderListResponse(items=items, total=total)


@router.get("/{id}", response_model=schemas.OrderAdminResponse)
async def read_order(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Получить детали заказа включая платежи."""
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order_dict = schemas.OrderAdminResponse.model_validate(order).model_dump()
    order_dict['final_amount_cents'] = calculate_final_amount(order)
    return schemas.OrderAdminResponse(**order_dict)


@router.get("/{id}/payments", response_model=List[schemas.PaymentInfo])
async def read_order_payments(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Получить список платежей по заказу."""
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order.payments


@router.patch("/{id}/status", response_model=schemas.OrderAdminResponse)
async def update_order_status(
    id: int,
    status_update: schemas.OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Обновить статус заказа.
    
    Допустимые переходы:
    - awaiting_payment → paid, cancelled
    - paid → processing, cancelled
    - processing → shipped, cancelled
    - shipped → delivered
    - delivered, cancelled → финальные статусы
    """
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Валидация перехода статуса
    if not validate_status_transition(order.status, status_update.status):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status transition from {order.status.value} to {status_update.status.value}"
        )
    
    old_status = order.status
    order.status = status_update.status
    db.add(order)
    await db.commit()
    
    # Re-fetch
    order = await crud_order.order.get_with_items(db, id=id)
    
    # Create finance transaction when order becomes paid
    if status_update.status == OrderStatus.PAID and old_status != OrderStatus.PAID:
        final_amount = calculate_final_amount(order)
        await crud_finance.create_sale_transaction(
            db=db,
            order_id=order.id,
            amount_cents=final_amount,
            admin_id=current_user.id
        )
    
    await log_admin_action(
        db, current_user.id, "update", "order", order.id, 
        f"Changed status: {old_status.value} → {status_update.status.value}"
    )
    
    # TODO: Send email notification (will be added in email_notifications service)
    
    order_dict = schemas.OrderAdminResponse.model_validate(order).model_dump()
    order_dict['final_amount_cents'] = calculate_final_amount(order)
    return schemas.OrderAdminResponse(**order_dict)


@router.patch("/{id}/tracking", response_model=schemas.OrderAdminResponse)
async def update_tracking_number(
    id: int,
    tracking_update: schemas.OrderTrackingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Установить трек-номер для заказа.
    
    Обычно используется после смены статуса на 'shipped'.
    """
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Предупреждение если заказ не в статусе shipped
    if order.status not in [OrderStatus.SHIPPED, OrderStatus.PROCESSING]:
        raise HTTPException(
            status_code=400,
            detail="Tracking number can only be set for orders in 'processing' or 'shipped' status"
        )
    
    order = await crud_order.order.update_tracking(db, order, tracking_update.tracking_number)
    order = await crud_order.order.get_with_items(db, id=id)
    
    await log_admin_action(
        db, current_user.id, "update", "order", order.id, 
        f"Set tracking number: {tracking_update.tracking_number}"
    )
    
    # TODO: Send email with tracking number
    
    order_dict = schemas.OrderAdminResponse.model_validate(order).model_dump()
    order_dict['final_amount_cents'] = calculate_final_amount(order)
    return schemas.OrderAdminResponse(**order_dict)


@router.post("/{id}/cancel", response_model=schemas.OrderAdminResponse)
async def cancel_order(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Отменить заказ.
    
    Можно отменить только заказы в статусах: awaiting_payment, paid, processing.
    """
    order = await crud_order.order.get_with_items(db, id=id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Проверка возможности отмены
    cancellable_statuses = [
        OrderStatus.AWAITING_PAYMENT, 
        OrderStatus.PAID, 
        OrderStatus.PROCESSING
    ]
    if order.status not in cancellable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order in status '{order.status.value}'"
        )
    
    old_status = order.status
    order.status = OrderStatus.CANCELLED
    db.add(order)
    await db.commit()
    
    order = await crud_order.order.get_with_items(db, id=id)
    
    await log_admin_action(
        db, current_user.id, "cancel", "order", order.id, 
        f"Cancelled order (was: {old_status.value})"
    )
    
    # TODO: If order was paid, initiate refund
    # TODO: Return reserved stock to inventory
    
    order_dict = schemas.OrderAdminResponse.model_validate(order).model_dump()
    order_dict['final_amount_cents'] = calculate_final_amount(order)
    return schemas.OrderAdminResponse(**order_dict)

