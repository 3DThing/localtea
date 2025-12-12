from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field
from datetime import datetime
from backend.models.order import OrderStatus, DeliveryMethod

class OrderItemResponse(BaseModel):
    id: int
    sku_id: int
    title: str
    sku_info: Optional[str] = None
    price_cents: int
    quantity: int

    model_config = ConfigDict(from_attributes=True)

class OrderResponse(BaseModel):
    id: int
    status: OrderStatus
    total_amount_cents: int
    delivery_cost_cents: int = 0
    discount_amount_cents: int = 0
    promo_code: Optional[str] = None
    delivery_method: DeliveryMethod = DeliveryMethod.PICKUP
    tracking_number: Optional[str] = None
    shipping_address: Optional[Dict[str, Any]] = None
    contact_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    items: List[OrderItemResponse] = []
    payment_url: Optional[str] = None # For checkout response

    model_config = ConfigDict(from_attributes=True)
    
    @computed_field
    @property
    def final_amount_cents(self) -> int:
        """Итоговая сумма к оплате = товары + доставка - скидка"""
        return max(0, self.total_amount_cents + self.delivery_cost_cents - self.discount_amount_cents)

class ContactInfo(BaseModel):
    """Контактные данные получателя"""
    firstname: str = Field(..., min_length=1, max_length=100)
    lastname: str = Field(..., min_length=1, max_length=100)
    middlename: Optional[str] = Field(None, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr

class ShippingAddress(BaseModel):
    """Адрес доставки (для Почты России)"""
    postal_code: str = Field(..., min_length=6, max_length=6)
    address: str = Field(..., min_length=1, max_length=500)

class OrderCheckout(BaseModel):
    """Запрос на создание заказа"""
    delivery_method: Literal["pickup", "russian_post"] = "pickup"
    contact_info: ContactInfo
    shipping_address: Optional[ShippingAddress] = None  # Обязательно для russian_post
    payment_method: str = "card"
    
    # Стоимость доставки (расчитывается на фронтенде и проверяется на бэке)
    delivery_cost_cents: int = 0
    
    # Промокод (опционально)
    promo_code: Optional[str] = None
