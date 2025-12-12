"""
Promo code model for discounts and promotions.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from backend.db.base_class import Base
import enum


class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"  # % от суммы
    FIXED = "fixed"  # Фиксированная сумма в копейках


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    
    # Код промокода (уникальный)
    code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Описание для админов
    description = Column(String(500), nullable=True)
    
    # Тип скидки
    discount_type = Column(
        SQLEnum(DiscountType, name='discounttype', create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=DiscountType.PERCENTAGE
    )
    
    # Значение скидки (% или копейки)
    discount_value = Column(Integer, nullable=False)
    
    # Минимальная сумма заказа для применения (в копейках)
    min_order_amount_cents = Column(Integer, default=0)
    
    # Максимальная скидка (для процентных, в копейках)
    max_discount_cents = Column(Integer, nullable=True)
    
    # Ограничение по количеству использований (общее)
    usage_limit = Column(Integer, nullable=True)
    
    # Количество использований
    usage_count = Column(Integer, default=0)
    
    # Ограничение использований на пользователя
    usage_limit_per_user = Column(Integer, default=1)
    
    # Период действия
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    
    # Активен ли промокод
    is_active = Column(Boolean, default=True)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def is_valid(self) -> bool:
        """Check if promo code is currently valid."""
        from datetime import datetime, timezone as tz
        now = datetime.now(tz.utc)
        
        if not self.is_active:
            return False
        
        if self.usage_limit and self.usage_count >= self.usage_limit:
            return False
        
        if self.valid_from and now < self.valid_from:
            return False
        
        if self.valid_until and now > self.valid_until:
            return False
        
        return True
    
    def calculate_discount(self, order_amount_cents: int) -> int:
        """Calculate discount amount in cents for given order amount."""
        if order_amount_cents < self.min_order_amount_cents:
            return 0
        
        if self.discount_type == DiscountType.PERCENTAGE:
            discount = int(order_amount_cents * self.discount_value / 100)
            if self.max_discount_cents:
                discount = min(discount, self.max_discount_cents)
            return discount
        else:  # FIXED
            return min(self.discount_value, order_amount_cents)
