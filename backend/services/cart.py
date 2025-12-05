from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete, func
from sqlalchemy.orm import selectinload, joinedload
from fastapi import HTTPException, status
from backend.models.cart import Cart, CartItem
from backend.models.catalog import SKU, Product, ProductImage
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

    async def get_cart_with_items(self, db: AsyncSession, user_id: Optional[int] = None, session_id: Optional[str] = None) -> cart_schemas.CartResponse:
        cart = await self.get_cart(db, user_id, session_id)
        if not cart:
             # Should not happen as get_cart creates one
             raise HTTPException(status_code=500, detail="Could not retrieve cart")

        # Calculate totals and format response
        items_response = []
        total_amount = 0
        
        # We need to ensure items are loaded. get_cart loads them if it fetches, but if it creates, it's empty.
        # If it was fetched, selectinload was used.
        
        for item in cart.items:
            # Check stock availability (optional here, but good for display)
            # For now just display what's in cart
            
            # Calculate price
            price = item.fixed_price_cents if item.fixed_price_cents is not None else item.sku.price_cents
            item_total = price * item.quantity
            total_amount += item_total
            
            # Get main image
            main_image = None
            if item.sku.product.images:
                main_image = next((img.url for img in item.sku.product.images if img.is_main), item.sku.product.images[0].url)

            sku_response = cart_schemas.CartSKU(
                id=item.sku.id,
                title=item.sku.product.title,
                weight=item.sku.weight,
                price_cents=price,
                image=main_image
            )
            
            items_response.append(cart_schemas.CartItemResponse(
                id=item.id,
                sku=sku_response,
                quantity=item.quantity,
                total_cents=item_total
            ))
            
        return cart_schemas.CartResponse(
            id=cart.id,
            total_amount_cents=total_amount,
            items=items_response
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
