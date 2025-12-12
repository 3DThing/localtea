"""
Refund model for tracking refund history.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base_class import Base


class Refund(Base):
    """Track refund requests and their status."""
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    
    # Order being refunded
    order_id = Column(Integer, ForeignKey('order.id'), nullable=False, index=True)
    
    # Original payment ID from YooKassa
    payment_id = Column(String(100), nullable=False)
    
    # YooKassa refund ID
    refund_id = Column(String(100), nullable=True)
    
    # Amount refunded in cents
    amount_cents = Column(Integer, nullable=False)
    
    # Reason for refund
    reason = Column(Text, nullable=False)
    
    # Status: pending, succeeded, canceled
    status = Column(String(20), default="pending")
    
    # Admin who initiated the refund
    admin_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    order = relationship("Order", backref="refunds")
    admin = relationship("User", foreign_keys=[admin_id])
