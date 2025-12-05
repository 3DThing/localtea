from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone

from backend.models.order import Order, OrderItem, OrderStatus, Payment, PaymentStatus
from backend.models.catalog import SKU
from backend.models.cart import Cart
from backend.schemas import order as order_schemas
from backend.services.cart import cart_service
from backend.services.payment.yookassa import payment_service

class OrderService:
    async def checkout(
        self, 
        db: AsyncSession, 
        user_id: Optional[int], 
        session_id: Optional[str], 
        checkout_in: order_schemas.OrderCheckout
    ) -> order_schemas.OrderResponse:
        # 1. Get Cart
        cart = await cart_service.get_cart(db, user_id, session_id)
        if not cart or not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        # Load items with SKU to check prices and details
        # cart_service.get_cart might not load everything we need if we just used the basic one, 
        # but let's assume we need to reload or use what we have.
        # Ideally we fetch cart items with SKU.
        # Let's re-fetch to be sure we have latest data and lock? 
        # For MVP, just fetch.
        
        # We need to iterate and reserve.
        # To ensure atomicity, we can do it one by one or in a batch.
        # If one fails, we rollback the whole transaction (FastAPI dependency handles transaction scope, 
        # but we need to raise exception to trigger rollback).
        
        total_amount = 0
        order_items_data = []
        
        # 2. Calculate totals and prepare order items
        for item in cart.items:
            # Refresh SKU to get current price/stock? 
            # We will do atomic update later, but we need price.
            sku = await db.get(SKU, item.sku_id)
            if not sku:
                raise HTTPException(status_code=404, detail=f"SKU {item.sku_id} not found")
            
            if not sku.is_active:
                 raise HTTPException(status_code=400, detail=f"Product {sku.sku_code} is not available")

            price = item.fixed_price_cents if item.fixed_price_cents is not None else sku.price_cents
            total_amount += price * item.quantity
            
            order_items_data.append({
                "sku_id": sku.id,
                "title": sku.product.title if sku.product else "Unknown Product", # We need to load product
                "sku_info": f"{sku.weight}g", # Simplified info
                "price_cents": price,
                "quantity": item.quantity
            })

        # 3. Create Order
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        
        order = Order(
            user_id=user_id,
            session_id=session_id,
            status=OrderStatus.AWAITING_PAYMENT,
            total_amount_cents=total_amount,
            shipping_address=checkout_in.shipping_address.model_dump(),
            contact_info=checkout_in.contact_info.model_dump(),
            expires_at=expires_at
        )
        db.add(order)
        await db.flush() # Get ID
        
        # 4. Process Items: Create OrderItem and Reserve Stock
        for item_data in order_items_data:
            # Create OrderItem
            order_item = OrderItem(
                order_id=order.id,
                sku_id=item_data["sku_id"],
                title=item_data["title"],
                sku_info=item_data["sku_info"],
                price_cents=item_data["price_cents"],
                quantity=item_data["quantity"]
            )
            db.add(order_item)
            
            # Reserve Stock (Atomic Update)
            stmt = (
                update(SKU)
                .where(SKU.id == item_data["sku_id"])
                .where(SKU.quantity >= item_data["quantity"])
                .values(
                    quantity=SKU.quantity - item_data["quantity"],
                    reserved_quantity=SKU.reserved_quantity + item_data["quantity"]
                )
            )
            result = await db.execute(stmt)
            if result.rowcount == 0:
                # Rollback will happen automatically if we raise exception
                raise HTTPException(
                    status_code=400, 
                    detail=f"Not enough stock for product with SKU ID {item_data['sku_id']}"
                )

        # 5. Clear Cart
        await cart_service.clear_cart(db, user_id, session_id)
        
        # 6. Create Payment
        try:
            payment_data = await payment_service.create_payment(order, f"Order #{order.id}")
        except Exception as e:
            # If payment creation fails, we should probably rollback the order creation?
            # But we are in a transaction, so raising exception will rollback everything including order and stock reservation.
            raise e

        payment = Payment(
            order_id=order.id,
            external_id=payment_data["payment_id"],
            amount_cents=order.total_amount_cents,
            status=PaymentStatus.PENDING,
            provider_response=payment_data
        )
        db.add(payment)
        
        await db.commit()
        await db.refresh(order)
        
        # Load items for response
        query = select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        result = await db.execute(query)
        order = result.scalars().first()

        response = order_schemas.OrderResponse.model_validate(order)
        response.payment_url = payment_data["payment_url"]
        
        return response

    async def get_user_orders(
        self, 
        db: AsyncSession, 
        user_id: Optional[int],
        session_id: Optional[str]
    ) -> List[Order]:
        query = select(Order).options(selectinload(Order.items))
        
        if user_id:
            query = query.where(Order.user_id == user_id)
        elif session_id:
            query = query.where(Order.session_id == session_id)
        else:
            return []
            
        query = query.order_by(desc(Order.created_at))
        
        result = await db.execute(query)
        return result.scalars().all()

    async def get_order(
        self,
        db: AsyncSession,
        order_id: int,
        user_id: Optional[int],
        session_id: Optional[str]
    ) -> Optional[Order]:
        query = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
        
        if user_id:
            query = query.where(Order.user_id == user_id)
        elif session_id:
            query = query.where(Order.session_id == session_id)
            
        result = await db.execute(query)
        return result.scalars().first()

    async def cancel_order(
        self,
        db: AsyncSession,
        order_id: int,
        user_id: Optional[int],
        session_id: Optional[str]
    ) -> Order:
        order = await self.get_order(db, order_id, user_id, session_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
            
        if order.status != OrderStatus.AWAITING_PAYMENT:
             raise HTTPException(status_code=400, detail="Cannot cancel order in this status")
             
        order.status = OrderStatus.CANCELLED
        
        # Return stock
        for item in order.items:
            stmt = (
                update(SKU)
                .where(SKU.id == item.sku_id)
                .values(
                    quantity=SKU.quantity + item.quantity,
                    reserved_quantity=SKU.reserved_quantity - item.quantity
                )
            )
            await db.execute(stmt)
            
        # Update payment status if exists
        payment_result = await db.execute(select(Payment).where(Payment.order_id == order.id))
        payment = payment_result.scalars().first()
        if payment:
            payment.status = PaymentStatus.FAILED
            db.add(payment)
            
        db.add(order)
        await db.commit()
        
        # Reload order with items to ensure response is correct
        query = select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        result = await db.execute(query)
        return result.scalars().first()

    async def process_payment_webhook(self, db: AsyncSession, event: Dict[str, Any]):
        event_type = event.get("event")
        obj = event.get("object", {})
        payment_id = obj.get("id")
        
        if not payment_id:
            return

        # Find payment
        result = await db.execute(select(Payment).where(Payment.external_id == payment_id))
        payment = result.scalars().first()
        
        if not payment:
            # Log warning
            return

        # Idempotency check: if status already final, ignore
        if payment.status in (PaymentStatus.SUCCEEDED, PaymentStatus.FAILED):
            return

        # Verify with Yookassa
        real_status_data = await payment_service.check_payment(payment_id)
        real_status = real_status_data.get("status")
        
        order = await db.get(Order, payment.order_id)
        if not order:
            return

        if real_status == "succeeded" and event_type == "payment.succeeded":
            payment.status = PaymentStatus.SUCCEEDED
            order.status = OrderStatus.PAID
            
            # Finalize stock: reduce reserved_quantity
            result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
            items = result.scalars().all()
            
            for item in items:
                stmt = (
                    update(SKU)
                    .where(SKU.id == item.sku_id)
                    .values(reserved_quantity=SKU.reserved_quantity - item.quantity)
                )
                await db.execute(stmt)
                
        elif real_status == "canceled" and event_type == "payment.canceled":
            payment.status = PaymentStatus.FAILED
            order.status = OrderStatus.CANCELLED
            
            # Return stock
            result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
            items = result.scalars().all()
            
            for item in items:
                stmt = (
                    update(SKU)
                    .where(SKU.id == item.sku_id)
                    .values(
                        quantity=SKU.quantity + item.quantity,
                        reserved_quantity=SKU.reserved_quantity - item.quantity
                    )
                )
                await db.execute(stmt)
        
        payment.provider_response = real_status_data
        db.add(payment)
        db.add(order)
        await db.commit()

    async def cancel_expired_orders(self, db: AsyncSession):
        now = datetime.now(timezone.utc)
        query = select(Order).where(
            Order.status == OrderStatus.AWAITING_PAYMENT,
            Order.expires_at < now
        )
        result = await db.execute(query)
        expired_orders = result.scalars().all()
        
        for order in expired_orders:
            order.status = OrderStatus.CANCELLED
            
            # Return stock
            # We need to load items
            items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
            items = items_result.scalars().all()
            
            for item in items:
                stmt = (
                    update(SKU)
                    .where(SKU.id == item.sku_id)
                    .values(
                        quantity=SKU.quantity + item.quantity,
                        reserved_quantity=SKU.reserved_quantity - item.quantity
                    )
                )
                await db.execute(stmt)
            
            # Update payment status if exists?
            payment_result = await db.execute(select(Payment).where(Payment.order_id == order.id))
            payment = payment_result.scalars().first()
            if payment:
                payment.status = PaymentStatus.FAILED
                db.add(payment)
                
            db.add(order)
            
        await db.commit()

order_service = OrderService()
