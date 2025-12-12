from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, func, update
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException, status
from backend.models.cart import Cart, CartItem
from backend.models.catalog import SKU, Product, ProductImage
from backend.models.promo_code import PromoCode
from backend.schemas import cart as cart_schemas

class CartService:
    async def _get_cart_query(self, user_id: Optional[int], session_id: Optional[str]):
        query = select(Cart).options(
            selectinload(Cart.items).selectinload(CartItem.sku).selectinload(SKU.product).selectinload(Product.images)
        )
        if user_id:
            query = query.where(Cart.user_id == user_id)
        elif session_id:
            query = query.where(Cart.session_id == session_id)
        else:
            return None
        return query

    async def get_cart(self, db: AsyncSession, user_id: Optional[int] = None, session_id: Optional[str] = None) -> Optional[Cart]:
        if not user_id and not session_id:
            return None
            
        query = await self._get_cart_query(user_id, session_id)
        if query is None:
            return None
            
        result = await db.execute(query)
        cart = result.scalars().first()
        
        if not cart:
            # Create new cart
            cart = Cart(user_id=user_id, session_id=session_id)
            db.add(cart)
            await db.commit()
            # Re-fetch to get relationships properly loaded via the query with options
            return await self.get_cart(db, user_id, session_id)
            
        return cart

    async def get_cart_with_items(
        self, 
        db: AsyncSession, 
        user_id: Optional[int] = None, 
        session_id: Optional[str] = None,
        promo_code: Optional[str] = None
    ) -> cart_schemas.CartResponse:
        cart = await self.get_cart(db, user_id, session_id)
        if not cart:
             # Should not happen as get_cart creates one
             raise HTTPException(status_code=500, detail="Could not retrieve cart")

        # Calculate totals and format response
        items_response = []
        total_amount = 0  # Сумма без скидок
        discount_amount = 0  # Скидки на товары
        
        for item in cart.items:
            # Оригинальная цена (до скидки)
            original_price = item.sku.price_cents
            # Скидка на товар
            item_discount = item.sku.discount_cents or 0
            # Финальная цена (со скидкой товара)
            final_price = original_price - item_discount
            if final_price < 0:
                final_price = 0
            
            # Если есть фиксированная цена в корзине - используем её
            if item.fixed_price_cents is not None:
                final_price = item.fixed_price_cents
                item_discount = max(0, original_price - final_price)
            
            item_total = final_price * item.quantity
            total_amount += original_price * item.quantity
            discount_amount += item_discount * item.quantity
            
            # Get main image
            main_image = None
            if item.sku.product.images:
                main_image = next((img.url for img in item.sku.product.images if img.is_main), item.sku.product.images[0].url)

            sku_response = cart_schemas.CartSKU(
                id=item.sku.id,
                title=item.sku.product.title,
                weight=item.sku.weight,
                price_cents=final_price,
                original_price_cents=original_price,
                discount_cents=item_discount,
                image=main_image
            )
            
            items_response.append(cart_schemas.CartItemResponse(
                id=item.id,
                sku=sku_response,
                quantity=item.quantity,
                total_cents=item_total
            ))
        
        # Сумма после скидок на товары
        subtotal = total_amount - discount_amount
        
        # Проверяем и применяем промокод
        promo_discount = 0
        applied_promo_code = None
        
        if promo_code:
            promo = await self._get_valid_promo(db, promo_code, subtotal, user_id)
            if promo:
                promo_discount = promo.calculate_discount(subtotal)
                applied_promo_code = promo.code
        
        final_amount = subtotal - promo_discount
        if final_amount < 0:
            final_amount = 0
            
        return cart_schemas.CartResponse(
            id=cart.id,
            total_amount_cents=total_amount,
            discount_amount_cents=discount_amount,
            promo_discount_cents=promo_discount,
            promo_code=applied_promo_code,
            final_amount_cents=final_amount,
            items=items_response
        )
    
    async def _get_valid_promo(
        self, 
        db: AsyncSession, 
        code: str, 
        order_amount: int,
        user_id: Optional[int] = None
    ) -> Optional[PromoCode]:
        """Проверить и получить валидный промокод"""
        result = await db.execute(
            select(PromoCode).where(PromoCode.code == code.upper())
        )
        promo = result.scalars().first()
        
        if not promo:
            return None
        
        if not promo.is_valid():
            return None
        
        if order_amount < promo.min_order_amount_cents:
            return None
        
        # TODO: проверить использование на пользователя если нужно
        
        return promo
    
    async def apply_promo_code(
        self, 
        db: AsyncSession, 
        user_id: Optional[int], 
        session_id: Optional[str],
        code: str
    ) -> cart_schemas.PromoCodeResponse:
        """Применить промокод и вернуть информацию о скидке"""
        cart = await self.get_cart_with_items(db, user_id, session_id)
        
        # Сумма после скидок на товары
        subtotal = cart.total_amount_cents - cart.discount_amount_cents
        
        result = await db.execute(
            select(PromoCode).where(PromoCode.code == code.upper())
        )
        promo = result.scalars().first()
        
        if not promo:
            raise HTTPException(status_code=404, detail="Промокод не найден")
        
        if not promo.is_valid():
            raise HTTPException(status_code=400, detail="Промокод недействителен или истёк")
        
        if subtotal < promo.min_order_amount_cents:
            min_amount = promo.min_order_amount_cents / 100
            raise HTTPException(
                status_code=400, 
                detail=f"Минимальная сумма заказа для этого промокода: {min_amount:.0f} ₽"
            )
        
        discount_amount = promo.calculate_discount(subtotal)
        
        return cart_schemas.PromoCodeResponse(
            code=promo.code,
            discount_type=promo.discount_type.value,
            discount_value=promo.discount_value,
            discount_amount_cents=discount_amount,
            message=f"Промокод применён! Скидка: {discount_amount / 100:.0f} ₽"
        )

    async def add_item(self, db: AsyncSession, user_id: Optional[int], session_id: Optional[str], item_in: cart_schemas.CartItemCreate):
        cart = await self.get_cart(db, user_id, session_id)
        
        # Check if SKU exists and is active
        sku = await db.get(SKU, item_in.sku_id)
        if not sku or not sku.is_active:
            raise HTTPException(status_code=404, detail="Product variant not found")
            
        # Check stock
        if sku.quantity < item_in.quantity:
             raise HTTPException(status_code=400, detail=f"Not enough stock. Available: {sku.quantity}")

        # Check if item already in cart
        # We can iterate over cart.items since it's loaded
        existing_item = next((i for i in cart.items if i.sku_id == item_in.sku_id), None)
        
        if existing_item:
            new_quantity = existing_item.quantity + item_in.quantity
            if sku.quantity < new_quantity:
                 raise HTTPException(status_code=400, detail=f"Not enough stock. Available: {sku.quantity}")
            existing_item.quantity = new_quantity
            db.add(existing_item)
        else:
            new_item = CartItem(
                cart_id=cart.id,
                sku_id=item_in.sku_id,
                quantity=item_in.quantity
            )
            db.add(new_item)
            
        await db.commit()
        db.expire(cart)
        return await self.get_cart_with_items(db, user_id, session_id)

    async def update_item(self, db: AsyncSession, user_id: Optional[int], session_id: Optional[str], item_id: int, item_in: cart_schemas.CartItemUpdate):
        cart = await self.get_cart(db, user_id, session_id)
        
        item = await db.get(CartItem, item_id)
        if not item or item.cart_id != cart.id:
            raise HTTPException(status_code=404, detail="Cart item not found")
            
        if item_in.quantity <= 0:
            await db.delete(item)
        else:
            # Check stock
            # Need to fetch SKU to check stock
            sku = await db.get(SKU, item.sku_id)
            if sku.quantity < item_in.quantity:
                 raise HTTPException(status_code=400, detail=f"Not enough stock. Available: {sku.quantity}")
            
            item.quantity = item_in.quantity
            db.add(item)
            
        await db.commit()
        db.expire(cart)
        return await self.get_cart_with_items(db, user_id, session_id)

    async def remove_item(self, db: AsyncSession, user_id: Optional[int], session_id: Optional[str], item_id: int):
        cart = await self.get_cart(db, user_id, session_id)
        
        item = await db.get(CartItem, item_id)
        if not item or item.cart_id != cart.id:
            raise HTTPException(status_code=404, detail="Cart item not found")
            
        await db.delete(item)
        await db.commit()
        db.expire(cart)
        return await self.get_cart_with_items(db, user_id, session_id)

    async def clear_cart(self, db: AsyncSession, user_id: Optional[int], session_id: Optional[str]):
        cart = await self.get_cart(db, user_id, session_id)
        
        # Delete all items
        await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
        await db.commit()
        db.expire(cart)
        return await self.get_cart_with_items(db, user_id, session_id)

    async def merge_carts(self, db: AsyncSession, user_id: int, session_id: str):
        """
        Merge anonymous cart (session_id) into user cart (user_id).
        """
        # Get anonymous cart
        anon_cart_query = await self._get_cart_query(user_id=None, session_id=session_id)
        if anon_cart_query is None:
            return

        result = await db.execute(anon_cart_query)
        anon_cart = result.scalars().first()
        
        if not anon_cart or not anon_cart.items:
            return # Nothing to merge
            
        # Get user cart
        user_cart = await self.get_cart(db, user_id=user_id)
        
        for anon_item in anon_cart.items:
            # Check if item exists in user cart
            existing_item = next((i for i in user_cart.items if i.sku_id == anon_item.sku_id), None)
            
            if existing_item:
                existing_item.quantity += anon_item.quantity
                # We might want to check stock here again, but for merge we usually just add up
                # and let the user deal with it at checkout or validate later.
                db.add(existing_item)
            else:
                # Move item to user cart
                # We can just change cart_id, but since we are iterating, safer to create new and delete old
                # or just reassign.
                anon_item.cart_id = user_cart.id
                db.add(anon_item)
        
        # Delete anonymous cart? 
        # Usually we keep it empty or delete it. 
        # If we moved all items by reassigning cart_id, anon_cart.items will be empty.
        # If we created new items, we need to delete anon items.
        # Reassigning cart_id is efficient.
        
        # However, since we iterated and modified, let's just delete the anon cart to be clean.
        # But wait, if we reassigned items, they are now in user_cart.
        # If we delete anon_cart, we shouldn't cascade delete items if they were moved.
        # If we moved them, they are no longer in anon_cart.
        
        # Let's just delete the anon cart record.
        await db.delete(anon_cart)
        await db.commit()

cart_service = CartService()
