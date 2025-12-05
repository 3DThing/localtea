from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from backend.models.order import OrderStatus
from backend.schemas.order import OrderItemResponse

class OrderAdminResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    status: OrderStatus
    total_amount_cents: int
    shipping_address: Optional[Dict[str, Any]] = None
    contact_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    items: List[OrderItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class OrderStatusUpdate(BaseModel):
    status: OrderStatus
