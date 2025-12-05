from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from backend.models.order import OrderStatus

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
    shipping_address: Optional[Dict[str, Any]] = None
    contact_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    items: List[OrderItemResponse] = []
    payment_url: Optional[str] = None # For checkout response

    model_config = ConfigDict(from_attributes=True)

class ContactInfo(BaseModel):
    email: EmailStr
    phone: str
    name: str

class ShippingAddress(BaseModel):
    city: str
    street: str
    building: str
    apartment: Optional[str] = None
    zip_code: Optional[str] = None

class OrderCheckout(BaseModel):
    contact_info: ContactInfo
    shipping_address: ShippingAddress
    payment_method: str = "card"
