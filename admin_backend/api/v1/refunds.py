"""
Refunds management API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from backend.db.session import get_db
from backend.models.user import User
from backend.models.order import Order, OrderStatus, Payment
from backend.models.refund import Refund
from backend.services.payment.yookassa import payment_service
from admin_backend.core.deps import get_current_admin
from admin_backend.schemas import refund as schemas
from admin_backend.services.audit_log import log_admin_action
from admin_backend.services.email_notifications import send_order_status_notification
from admin_backend.crud.crud_finance import finance as crud_finance

router = APIRouter()


@router.get("", response_model=schemas.RefundListResponse)
async def list_refunds(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    order_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    List all refunds.
    
    - **order_id**: Filter by order
    - **status**: Filter by status (pending, succeeded, canceled)
    """
    query = select(Refund)
    
    if order_id:
        query = query.where(Refund.order_id == order_id)
    if status:
        query = query.where(Refund.status == status)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Paginate
    query = query.order_by(Refund.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    refunds = result.scalars().all()
    
    items = [
        schemas.RefundResponse(
            id=r.id,
            order_id=r.order_id,
            payment_id=r.payment_id,
            refund_id=r.refund_id,
            amount_cents=r.amount_cents,
            reason=r.reason,
            status=r.status,
            admin_id=r.admin_id,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in refunds
    ]
    
    return schemas.RefundListResponse(items=items, total=total)


@router.get("/order/{order_id}", response_model=schemas.OrderRefundInfo)
async def get_order_refund_info(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get refund information for an order."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get all refunds for this order
    result = await db.execute(
        select(Refund).where(Refund.order_id == order_id).order_by(Refund.created_at.desc())
    )
    refunds = result.scalars().all()
    
    # Calculate totals
    total_refunded = sum(r.amount_cents for r in refunds if r.status == "succeeded")
    order_total = order.total_amount_cents + (order.delivery_cost_cents or 0)
    remaining = order_total - total_refunded
    
    # Get payment ID
    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order_id, Payment.status == "succeeded")
    )
    payment = payment_result.scalars().first()
    payment_id = payment.yookassa_payment_id if payment else None
    
    # Can refund if order is paid and has remaining amount
    can_refund = (
        order.status in [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED] and
        remaining > 0 and
        payment_id is not None
    )
    
    refund_responses = [
        schemas.RefundResponse(
            id=r.id,
            order_id=r.order_id,
            payment_id=r.payment_id,
            refund_id=r.refund_id,
            amount_cents=r.amount_cents,
            reason=r.reason,
            status=r.status,
            admin_id=r.admin_id,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in refunds
    ]
    
    return schemas.OrderRefundInfo(
        order_id=order_id,
        order_total_cents=order_total,
        total_refunded_cents=total_refunded,
        remaining_refundable_cents=remaining,
        refunds=refund_responses,
        can_refund=can_refund,
        payment_id=payment_id
    )


@router.post("", response_model=schemas.RefundResponse, status_code=201)
async def create_refund(
    data: schemas.RefundCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a refund for an order.
    
    Initiates refund through YooKassa payment gateway.
    """
    order = await db.get(Order, data.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check order status
    if order.status not in [OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
        raise HTTPException(
            status_code=400, 
            detail="Can only refund paid, shipped, or delivered orders"
        )
    
    # Get payment
    payment_result = await db.execute(
        select(Payment).where(
            Payment.order_id == data.order_id, 
            Payment.status == "succeeded"
        )
    )
    payment = payment_result.scalars().first()
    
    if not payment or not payment.yookassa_payment_id:
        raise HTTPException(status_code=400, detail="No successful payment found for order")
    
    # Calculate remaining refundable amount
    refunds_result = await db.execute(
        select(func.sum(Refund.amount_cents)).where(
            Refund.order_id == data.order_id,
            Refund.status == "succeeded"
        )
    )
    total_refunded = refunds_result.scalar() or 0
    
    order_total = order.total_amount_cents + (order.delivery_cost_cents or 0)
    remaining = order_total - total_refunded
    
    # Determine refund amount
    if data.full_refund:
        refund_amount = remaining
    else:
        refund_amount = data.amount_cents
    
    if refund_amount <= 0:
        raise HTTPException(status_code=400, detail="Nothing to refund")
    
    if refund_amount > remaining:
        raise HTTPException(
            status_code=400, 
            detail=f"Refund amount exceeds remaining: {remaining} cents available"
        )
    
    # Create refund record (pending)
    refund = Refund(
        order_id=data.order_id,
        payment_id=payment.yookassa_payment_id,
        amount_cents=refund_amount,
        reason=data.reason,
        status="pending",
        admin_id=current_user.id
    )
    db.add(refund)
    await db.commit()
    await db.refresh(refund)
    
    # Call YooKassa API
    try:
        result = await payment_service.create_refund(
            payment_id=payment.yookassa_payment_id,
            amount_cents=refund_amount,
            description=data.reason
        )
        
        # Update refund record
        refund.refund_id = result["refund_id"]
        refund.status = result["status"]
        db.add(refund)
        await db.commit()
        await db.refresh(refund)
        
        # Create finance record for refund
        if refund.status == "succeeded":
            await crud_finance.create_refund_transaction(
                db=db,
                order_id=data.order_id,
                amount_cents=refund_amount,
                admin_id=current_user.id,
                reason=data.reason
            )
        
        # If full refund, update order status
        if data.full_refund or (total_refunded + refund_amount >= order_total):
            order.status = OrderStatus.CANCELLED
            db.add(order)
            await db.commit()
        
        await log_admin_action(
            db, current_user.id, "refund", "order", data.order_id,
            f"Created refund of {refund_amount} cents. Status: {refund.status}"
        )
        
        # Send notification email
        try:
            await send_order_status_notification(
                order.contact_info.get("email") if order.contact_info else None,
                order.id,
                "refunded",
                f"Возврат на сумму {refund_amount / 100:.2f} ₽"
            )
        except Exception as e:
            print(f"Failed to send refund notification: {e}")
        
    except HTTPException as e:
        # Update refund as failed
        refund.status = "canceled"
        db.add(refund)
        await db.commit()
        raise e
    
    return schemas.RefundResponse(
        id=refund.id,
        order_id=refund.order_id,
        payment_id=refund.payment_id,
        refund_id=refund.refund_id,
        amount_cents=refund.amount_cents,
        reason=refund.reason,
        status=refund.status,
        admin_id=refund.admin_id,
        created_at=refund.created_at,
        updated_at=refund.updated_at
    )


@router.get("/{refund_id}/status")
async def check_refund_status(
    refund_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Check refund status from YooKassa."""
    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")
    
    if not refund.refund_id:
        return {"status": refund.status, "message": "Refund not yet processed"}
    
    try:
        result = await payment_service.get_refund(refund.refund_id)
        
        # Update status if changed
        if result.get("status") and result["status"] != refund.status:
            refund.status = result["status"]
            db.add(refund)
            await db.commit()
        
        return {
            "refund_id": refund.id,
            "yookassa_refund_id": refund.refund_id,
            "status": result.get("status"),
            "amount": result.get("amount"),
            "created_at": result.get("created_at")
        }
    except Exception as e:
        return {"status": refund.status, "error": str(e)}
