from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone

from backend.models.order import Order, OrderItem, OrderStatus, Payment, PaymentStatus, DeliveryMethod
from backend.models.catalog import SKU
from backend.models.cart import Cart
from backend.models.finance import FinanceTransaction, TransactionType
from backend.models.inventory import ProductStock
from backend.models.promo_code import PromoCode
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

        total_amount = 0  # Сумма без скидок
        discount_amount = 0  # Сумма скидок на товары
        order_items_data = []
        
        # 2. Calculate totals and prepare order items (с учётом скидок на товары)
        for item in cart.items:
            sku = await db.get(SKU, item.sku_id)
            if not sku:
                raise HTTPException(status_code=404, detail=f"SKU {item.sku_id} not found")
            
            if not sku.is_active:
                 raise HTTPException(status_code=400, detail=f"Product {sku.sku_code} is not available")

            # Оригинальная цена
            original_price = sku.price_cents
            # Скидка на товар
            item_discount = sku.discount_cents or 0
            # Финальная цена со скидкой товара
            final_price = original_price - item_discount
            if final_price < 0:
                final_price = 0
            
            # Если есть фиксированная цена в корзине
            if item.fixed_price_cents is not None:
                final_price = item.fixed_price_cents
                item_discount = max(0, original_price - final_price)
            
            total_amount += original_price * item.quantity
            discount_amount += item_discount * item.quantity
            
            order_items_data.append({
                "sku_id": sku.id,
                "title": sku.product.title if sku.product else "Unknown Product",
                "sku_info": f"{sku.weight}g",
                "price_cents": final_price,  # Цена со скидкой товара
                "quantity": item.quantity
            })

        # Сумма после скидок на товары
        subtotal = total_amount - discount_amount
        
        # 3. Проверяем и применяем промокод
        promo_discount = 0
        applied_promo_code = None
        
        if checkout_in.promo_code:
            result = await db.execute(
                select(PromoCode).where(PromoCode.code == checkout_in.promo_code.upper())
            )
            promo = result.scalars().first()
            
            if promo and promo.is_valid() and subtotal >= promo.min_order_amount_cents:
                promo_discount = promo.calculate_discount(subtotal)
                applied_promo_code = promo.code
                
                # Увеличиваем счётчик использований
                promo.usage_count += 1
                db.add(promo)

        # 4. Create Order
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        
        # Определяем метод доставки
        delivery_method = DeliveryMethod.PICKUP
        if checkout_in.delivery_method == "russian_post":
            delivery_method = DeliveryMethod.RUSSIAN_POST
            if not checkout_in.shipping_address:
                raise HTTPException(
                    status_code=400,
                    detail="Для доставки Почтой России необходимо указать адрес"
                )
        
        # Подготовка данных адреса
        shipping_address_data = None
        if checkout_in.shipping_address:
            shipping_address_data = checkout_in.shipping_address.model_dump()
        
        # Подготовка контактных данных
        contact_info_data = checkout_in.contact_info.model_dump()
        
        # Стоимость доставки
        delivery_cost = checkout_in.delivery_cost_cents if checkout_in.delivery_method == "russian_post" else 0
        
        # Общая скидка = скидки на товары + промокод
        total_discount = discount_amount + promo_discount
        
        order = Order(
            user_id=user_id,
            session_id=session_id,
            status=OrderStatus.AWAITING_PAYMENT,
            total_amount_cents=subtotal,  # Сумма товаров после скидок
            delivery_cost_cents=delivery_cost,
            discount_amount_cents=promo_discount,  # Скидка по промокоду
            promo_code=applied_promo_code,
            delivery_method=delivery_method,
            shipping_address=shipping_address_data,
            contact_info=contact_info_data,
            expires_at=expires_at
        )
        db.add(order)
        await db.flush() # Get ID
        
        # 5. Process Items: Create OrderItem and Reserve Stock
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
            
            # Sync ProductStock (warehouse view)
            product_stock_stmt = (
                update(ProductStock)
                .where(ProductStock.sku_id == item_data["sku_id"])
                .values(
                    quantity=ProductStock.quantity - item_data["quantity"],
                    reserved=ProductStock.reserved + item_data["quantity"]
                )
            )
            await db.execute(product_stock_stmt)

        # 6. Clear Cart
        await cart_service.clear_cart(db, user_id, session_id)
        
        # 7. Create Payment (товары + доставка - скидка промокода)
        total_with_delivery = order.total_amount_cents + order.delivery_cost_cents - order.discount_amount_cents
        if total_with_delivery < 0:
            total_with_delivery = 0
        try:
            payment_data = await payment_service.create_payment(order, f"Order #{order.id}")
        except Exception as e:
            # If payment creation fails, we should probably rollback the order creation?
            # But we are in a transaction, so raising exception will rollback everything including order and stock reservation.
            raise e

        payment = Payment(
            order_id=order.id,
            external_id=payment_data["payment_id"],
            amount_cents=total_with_delivery,
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

    async def get_payment_url(self, db: AsyncSession, order: Order) -> Optional[str]:
        """Get existing payment URL or create new payment for order."""
        # First, check if there's a pending payment and verify its status
        result = await db.execute(
            select(Payment)
            .where(Payment.order_id == order.id)
            .where(Payment.status == PaymentStatus.PENDING)
        )
        payment = result.scalars().first()
        
        if payment and payment.external_id:
            # Check payment status with YooKassa
            try:
                status_data = await payment_service.check_payment(payment.external_id)
                real_status = status_data.get("status")
                
                if real_status == "succeeded":
                    # Update payment and order status
                    payment.status = PaymentStatus.SUCCEEDED
                    order.status = OrderStatus.PAID
                    
                    # Create finance transaction for the sale
                    # Итоговая сумма = товары + доставка - скидка промокода
                    total_amount = order.total_amount_cents + (order.delivery_cost_cents or 0) - (order.discount_amount_cents or 0)
                    if total_amount < 0:
                        total_amount = 0
                    
                    # Check if finance transaction already exists
                    existing_tx = await db.execute(
                        select(FinanceTransaction).where(FinanceTransaction.order_id == order.id)
                    )
                    if not existing_tx.scalars().first():
                        # Get current balance
                        balance_result = await db.execute(
                            select(FinanceTransaction.balance_after_cents)
                            .order_by(FinanceTransaction.id.desc())
                            .limit(1)
                        )
                        current_balance = balance_result.scalar() or 0
                        new_balance = current_balance + total_amount
                        
                        finance_tx = FinanceTransaction(
                            transaction_type=TransactionType.SALE,
                            amount_cents=total_amount,
                            description=f"Оплата заказа #{order.id}",
                            order_id=order.id,
                            balance_after_cents=new_balance
                        )
                        db.add(finance_tx)
                    
                    db.add(payment)
                    db.add(order)
                    await db.commit()
                    return None  # No need to pay, already paid
                elif real_status == "canceled":
                    # Mark payment as failed, will create new one below
                    payment.status = PaymentStatus.FAILED
                    db.add(payment)
                    await db.commit()
                elif real_status == "pending" and payment.provider_response:
                    # Still pending, return existing URL
                    return payment.provider_response.get("payment_url")
            except Exception as e:
                print(f"Error checking payment status: {e}")
                # If check fails, try to return existing URL
                if payment.provider_response:
                    return payment.provider_response.get("payment_url")
        
        # Create new payment if no valid pending payment exists
        try:
            total_with_delivery = order.total_amount_cents + (order.delivery_cost_cents or 0)
            payment_data = await payment_service.create_payment(order, f"Order #{order.id}")
            
            new_payment = Payment(
                order_id=order.id,
                external_id=payment_data["payment_id"],
                amount_cents=total_with_delivery,
                status=PaymentStatus.PENDING,
                provider_response=payment_data
            )
            db.add(new_payment)
            await db.commit()
            
            return payment_data["payment_url"]
        except Exception:
            return None

    async def check_and_update_order_status(self, db: AsyncSession, order: Order) -> Order:
        """Check payment status and update order if paid."""
        if order.status != OrderStatus.AWAITING_PAYMENT:
            return order
            
        result = await db.execute(
            select(Payment)
            .where(Payment.order_id == order.id)
            .where(Payment.status == PaymentStatus.PENDING)
        )
        payment = result.scalars().first()
        
        if payment and payment.external_id:
            try:
                status_data = await payment_service.check_payment(payment.external_id)
                real_status = status_data.get("status")
                
                if real_status == "succeeded":
                    payment.status = PaymentStatus.SUCCEEDED
                    order.status = OrderStatus.PAID
                    
                    # Create finance transaction for the sale (with duplicate check)
                    # Итоговая сумма = товары + доставка - скидка промокода
                    total_amount = order.total_amount_cents + (order.delivery_cost_cents or 0) - (order.discount_amount_cents or 0)
                    if total_amount < 0:
                        total_amount = 0
                    
                    # Check if finance transaction already exists
                    existing_tx = await db.execute(
                        select(FinanceTransaction).where(FinanceTransaction.order_id == order.id)
                    )
                    if not existing_tx.scalars().first():
                        # Get current balance
                        balance_result = await db.execute(
                            select(FinanceTransaction.balance_after_cents)
                            .order_by(FinanceTransaction.id.desc())
                            .limit(1)
                        )
                        current_balance = balance_result.scalar() or 0
                        new_balance = current_balance + total_amount
                        
                        finance_tx = FinanceTransaction(
                            transaction_type=TransactionType.SALE,
                            amount_cents=total_amount,
                            description=f"Оплата заказа #{order.id}",
                            order_id=order.id,
                            balance_after_cents=new_balance
                        )
                        db.add(finance_tx)
                    
                    # Finalize stock
                    result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
                    items = result.scalars().all()
                    for item in items:
                        stmt = (
                            update(SKU)
                            .where(SKU.id == item.sku_id)
                            .values(reserved_quantity=SKU.reserved_quantity - item.quantity)
                        )
                        await db.execute(stmt)
                        # Sync ProductStock
                        await db.execute(
                            update(ProductStock)
                            .where(ProductStock.sku_id == item.sku_id)
                            .values(reserved=ProductStock.reserved - item.quantity)
                        )
                    
                    db.add(payment)
                    db.add(order)
                    await db.commit()
                    await db.refresh(order)
            except Exception as e:
                print(f"Error checking payment: {e}")
        
        return order

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
            # Sync ProductStock
            await db.execute(
                update(ProductStock)
                .where(ProductStock.sku_id == item.sku_id)
                .values(
                    quantity=ProductStock.quantity + item.quantity,
                    reserved=ProductStock.reserved - item.quantity
                )
            )
            
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
            
            # Create finance transaction for the sale (with duplicate check)
            # Итоговая сумма = товары + доставка - скидка промокода
            total_amount = order.total_amount_cents + (order.delivery_cost_cents or 0) - (order.discount_amount_cents or 0)
            if total_amount < 0:
                total_amount = 0
            
            # Check if finance transaction already exists
            existing_tx = await db.execute(
                select(FinanceTransaction).where(FinanceTransaction.order_id == order.id)
            )
            if not existing_tx.scalars().first():
                # Get current balance
                balance_result = await db.execute(
                    select(FinanceTransaction.balance_after_cents)
                    .order_by(FinanceTransaction.id.desc())
                    .limit(1)
                )
                current_balance = balance_result.scalar() or 0
                new_balance = current_balance + total_amount
                
                finance_tx = FinanceTransaction(
                    transaction_type=TransactionType.SALE,
                    amount_cents=total_amount,
                    description=f"Оплата заказа #{order.id}",
                    order_id=order.id,
                    balance_after_cents=new_balance
                )
                db.add(finance_tx)
            
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
                # Sync ProductStock
                await db.execute(
                    update(ProductStock)
                    .where(ProductStock.sku_id == item.sku_id)
                    .values(reserved=ProductStock.reserved - item.quantity)
                )
                
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
                # Sync ProductStock
                await db.execute(
                    update(ProductStock)
                    .where(ProductStock.sku_id == item.sku_id)
                    .values(
                        quantity=ProductStock.quantity + item.quantity,
                        reserved=ProductStock.reserved - item.quantity
                    )
                )
        
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
                # Sync ProductStock
                await db.execute(
                    update(ProductStock)
                    .where(ProductStock.sku_id == item.sku_id)
                    .values(
                        quantity=ProductStock.quantity + item.quantity,
                        reserved=ProductStock.reserved - item.quantity
                    )
                )
            
            # Update payment status if exists?
            payment_result = await db.execute(select(Payment).where(Payment.order_id == order.id))
            payment = payment_result.scalars().first()
            if payment:
                payment.status = PaymentStatus.FAILED
                db.add(payment)
                
            db.add(order)
            
        await db.commit()

order_service = OrderService()
