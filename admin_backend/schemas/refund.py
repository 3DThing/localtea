"""
Refunds management schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class RefundStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    CANCELED = "canceled"


class RefundCreate(BaseModel):
    order_id: int
    amount_cents: int = Field(..., gt=0, description="Amount to refund in cents")
    reason: str = Field(..., min_length=5, max_length=500, description="Reason for refund")
    full_refund: bool = False


class RefundResponse(BaseModel):
    id: int
    order_id: int
    payment_id: str
    refund_id: Optional[str] = None
    amount_cents: int
    reason: str
    status: str
    admin_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class RefundListResponse(BaseModel):
    items: List[RefundResponse]
    total: int


class OrderRefundInfo(BaseModel):
    """Refund information for an order."""
    order_id: int
    order_total_cents: int
    total_refunded_cents: int
    remaining_refundable_cents: int
    refunds: List[RefundResponse]
    can_refund: bool
    payment_id: Optional[str] = None
