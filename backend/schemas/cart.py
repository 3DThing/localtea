from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class CartSKU(BaseModel):
    id: int
    title: str
    weight: int
    price: int = Field(..., alias="price_cents")  # Цена со скидкой
    original_price: int = Field(default=0, alias="original_price_cents")  # Оригинальная цена
    discount: int = Field(default=0, alias="discount_cents")  # Скидка
    image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CartItemResponse(BaseModel):
    id: int
    sku: CartSKU
    quantity: int
    total_cents: int

    model_config = ConfigDict(from_attributes=True)

class CartResponse(BaseModel):
    id: int
    total_amount_cents: int
    discount_amount_cents: int = 0  # Скидка товаров
    promo_discount_cents: int = 0   # Скидка по промокоду
    promo_code: Optional[str] = None
    final_amount_cents: int = 0     # Итого со всеми скидками
    items: List[CartItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class CartItemCreate(BaseModel):
    sku_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int


class ApplyPromoCode(BaseModel):
    code: str


class PromoCodeResponse(BaseModel):
    code: str
    discount_type: str  # 'percentage' or 'fixed'
    discount_value: int
    discount_amount_cents: int  # Рассчитанная скидка
    message: str
