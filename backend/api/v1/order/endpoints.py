from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services.order import order_service
from backend.schemas import order as order_schemas

router = APIRouter()

@router.post("/checkout", response_model=order_schemas.OrderResponse)
async def checkout(
    checkout_in: order_schemas.OrderCheckout,
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Checkout cart and create order.
    """
    user_id, session_id = user_session
    if session_id:
        response.headers["X-Session-ID"] = session_id
        
    return await order_service.checkout(db, user_id, session_id, checkout_in)

@router.get("", response_model=List[order_schemas.OrderResponse])
async def get_orders(
    response: Response,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get user orders history.
    """
    user_id, session_id = user_session
    if session_id:
        response.headers["X-Session-ID"] = session_id
        
    orders = await order_service.get_user_orders(db, user_id, session_id)
    return orders

@router.get("/{order_id}", response_model=order_schemas.OrderResponse)
async def get_order_detail(
    order_id: int,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get order details.
    """
    user_id, session_id = user_session
    order = await order_service.get_order(db, order_id, user_id, session_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/{order_id}/cancel", response_model=order_schemas.OrderResponse)
async def cancel_order(
    order_id: int,
    user_session: tuple[Optional[int], str] = Depends(deps.get_user_or_session),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Cancel order.
    """
    user_id, session_id = user_session
    return await order_service.cancel_order(db, order_id, user_id, session_id)

