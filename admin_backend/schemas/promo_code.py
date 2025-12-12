"""
Promo code schemas for admin API.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class PromoCodeBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=50, description="Уникальный код промокода")
    description: Optional[str] = Field(None, max_length=500)
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: int = Field(..., gt=0, description="Значение скидки (% или копейки)")
    min_order_amount_cents: int = Field(0, ge=0, description="Минимальная сумма заказа")
    max_discount_cents: Optional[int] = Field(None, ge=0, description="Максимальная скидка (для %)")
    usage_limit: Optional[int] = Field(None, ge=1, description="Общий лимит использований")
    usage_limit_per_user: int = Field(1, ge=1, description="Лимит на пользователя")
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: bool = True
    
    @field_validator('code')
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        """Normalize code to uppercase."""
        return v.upper().strip()
    
    @field_validator('discount_value')
    @classmethod
    def validate_discount_value(cls, v: int, info) -> int:
        """Validate discount value based on type."""
        discount_type = info.data.get('discount_type')
        if discount_type == DiscountType.PERCENTAGE and v > 100:
            raise ValueError("Percentage discount cannot exceed 100%")
        return v


class PromoCodeCreate(PromoCodeBase):
    pass


class PromoCodeUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=500)
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[int] = Field(None, gt=0)
    min_order_amount_cents: Optional[int] = Field(None, ge=0)
    max_discount_cents: Optional[int] = None
    usage_limit: Optional[int] = None
    usage_limit_per_user: Optional[int] = Field(None, ge=1)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class PromoCodeResponse(PromoCodeBase):
    id: int
    usage_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_valid: bool = False  # Computed field
    
    model_config = {"from_attributes": True}


class PromoCodeListResponse(BaseModel):
    items: List[PromoCodeResponse]
    total: int


class PromoCodeValidate(BaseModel):
    code: str
    order_amount_cents: int = Field(..., gt=0)


class PromoCodeValidateResponse(BaseModel):
    valid: bool
    discount_amount_cents: int = 0
    message: Optional[str] = None
    promo_code: Optional[PromoCodeResponse] = None


class PromoCodeStats(BaseModel):
    """Statistics for a promo code."""
    id: int
    code: str
    total_uses: int
    total_discount_cents: int
    avg_order_amount_cents: int
    last_used_at: Optional[datetime] = None
