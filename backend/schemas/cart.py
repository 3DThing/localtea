from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class CartSKU(BaseModel):
    id: int
    title: str
    weight: int
    price: int = Field(..., alias="price_cents") # Alias to match DB or just use price_cents
    image: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CartItemResponse(BaseModel):
    id: int
    sku: CartSKU
    quantity: int
    total_cents: int

    model_config = ConfigDict(from_attributes=True)

class CartResponse(BaseModel):
    id: int
    total_amount_cents: int
    items: List[CartItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class CartItemCreate(BaseModel):
    sku_id: int
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int
