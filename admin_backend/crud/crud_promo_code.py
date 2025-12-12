"""
CRUD operations for promo codes.
"""
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from backend.models.promo_code import PromoCode, DiscountType
from admin_backend.schemas.promo_code import PromoCodeCreate, PromoCodeUpdate


class CRUDPromoCode:
    
    async def get(self, db: AsyncSession, id: int) -> Optional[PromoCode]:
        return await db.get(PromoCode, id)
    
    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[PromoCode]:
        result = await db.execute(
            select(PromoCode).where(PromoCode.code == code.upper())
        )
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        is_valid: Optional[bool] = None,
        q: Optional[str] = None,
    ) -> Tuple[List[PromoCode], int]:
        """Get promo codes with filters."""
        query = select(PromoCode)
        
        if is_active is not None:
            query = query.where(PromoCode.is_active == is_active)
        
        if q:
            query = query.where(
                PromoCode.code.ilike(f"%{q}%") | 
                PromoCode.description.ilike(f"%{q}%")
            )
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0
        
        # Paginate
        query = query.order_by(PromoCode.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()
        
        # Filter by validity if needed (in-memory, as it requires datetime checks)
        if is_valid is not None:
            items = [p for p in items if p.is_valid() == is_valid]
        
        return items, total
    
    async def create(self, db: AsyncSession, *, obj_in: PromoCodeCreate) -> PromoCode:
        """Create a new promo code."""
        db_obj = PromoCode(
            code=obj_in.code.upper(),
            description=obj_in.description,
            discount_type=DiscountType(obj_in.discount_type.value),
            discount_value=obj_in.discount_value,
            min_order_amount_cents=obj_in.min_order_amount_cents,
            max_discount_cents=obj_in.max_discount_cents,
            usage_limit=obj_in.usage_limit,
            usage_limit_per_user=obj_in.usage_limit_per_user,
            valid_from=obj_in.valid_from,
            valid_until=obj_in.valid_until,
            is_active=obj_in.is_active,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def update(
        self, 
        db: AsyncSession, 
        *, 
        db_obj: PromoCode, 
        obj_in: PromoCodeUpdate
    ) -> PromoCode:
        """Update a promo code."""
        update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "discount_type" and value:
                value = DiscountType(value.value)
            setattr(db_obj, field, value)
        
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def delete(self, db: AsyncSession, *, id: int) -> bool:
        """Delete a promo code."""
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
            return True
        return False
    
    async def validate_and_calculate(
        self, 
        db: AsyncSession, 
        code: str, 
        order_amount_cents: int,
        user_id: Optional[int] = None,
    ) -> Tuple[bool, int, str, Optional[PromoCode]]:
        """
        Validate a promo code and calculate discount.
        
        Returns: (valid, discount_cents, message, promo_code)
        """
        promo = await self.get_by_code(db, code)
        
        if not promo:
            return False, 0, "Промокод не найден", None
        
        if not promo.is_active:
            return False, 0, "Промокод неактивен", promo
        
        now = datetime.now(timezone.utc)
        
        if promo.valid_from and now < promo.valid_from:
            return False, 0, "Промокод ещё не активен", promo
        
        if promo.valid_until and now > promo.valid_until:
            return False, 0, "Срок действия промокода истёк", promo
        
        if promo.usage_limit and promo.usage_count >= promo.usage_limit:
            return False, 0, "Промокод больше не доступен", promo
        
        if order_amount_cents < promo.min_order_amount_cents:
            min_amount = promo.min_order_amount_cents / 100
            return False, 0, f"Минимальная сумма заказа: {min_amount:.0f} ₽", promo
        
        # TODO: Check per-user usage limit with order history
        
        discount = promo.calculate_discount(order_amount_cents)
        return True, discount, "Промокод применён", promo
    
    async def increment_usage(self, db: AsyncSession, promo_id: int) -> None:
        """Increment usage count when promo code is used."""
        promo = await self.get(db, promo_id)
        if promo:
            promo.usage_count += 1
            db.add(promo)
            await db.commit()


promo_code_crud = CRUDPromoCode()
