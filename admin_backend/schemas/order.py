from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from backend.models.order import OrderStatus, DeliveryMethod, PaymentStatus
from backend.schemas.order import OrderItemResponse


# --- Status Transition Rules ---
# READY_FOR_PICKUP can be set from any status (for pickup orders)
VALID_STATUS_TRANSITIONS = {
    OrderStatus.AWAITING_PAYMENT: [OrderStatus.PAID, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    OrderStatus.PAID: [OrderStatus.PROCESSING, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    OrderStatus.PROCESSING: [OrderStatus.SHIPPED, OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
    OrderStatus.READY_FOR_PICKUP: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],  # После получения - delivered
    OrderStatus.SHIPPED: [OrderStatus.DELIVERED, OrderStatus.READY_FOR_PICKUP],
    OrderStatus.DELIVERED: [OrderStatus.CANCELLED],  # Allow cancel for refunds
    OrderStatus.CANCELLED: [],  # Final state
}


class PaymentInfo(BaseModel):
    id: int
    external_id: Optional[str] = None
    amount_cents: int
    status: PaymentStatus
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class OrderAdminResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    status: OrderStatus
    total_amount_cents: int
    delivery_cost_cents: int = 0
    discount_amount_cents: int = 0
    promo_code: Optional[str] = None
    delivery_method: Optional[DeliveryMethod] = None
    tracking_number: Optional[str] = None
    shipping_address: Optional[Dict[str, Any]] = None
    contact_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    payments: List[PaymentInfo] = []
    final_amount_cents: Optional[int] = None  # total + delivery
    
    model_config = ConfigDict(from_attributes=True)


class OrderListResponse(BaseModel):
    items: List[OrderAdminResponse]
    total: int


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderTrackingUpdate(BaseModel):
    tracking_number: str = Field(..., min_length=1, max_length=100)


class OrderFilters(BaseModel):
    status: Optional[OrderStatus] = None
    delivery_method: Optional[DeliveryMethod] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    user_id: Optional[int] = None
    min_amount: Optional[int] = None  # в копейках
    max_amount: Optional[int] = None
    q: Optional[str] = None  # поиск по ID, телефону, email
