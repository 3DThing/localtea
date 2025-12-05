from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from backend.db.base_class import Base
from datetime import datetime, timezone
import enum

class OrderStatus(str, enum.Enum):
    AWAITING_PAYMENT = "awaiting_payment"
    PAID = "paid"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"

class PaymentStatus(str, enum.Enum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    PENDING = "pending"

class Order(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    session_id = Column(String, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.AWAITING_PAYMENT, nullable=False)
    total_amount_cents = Column(Integer, nullable=False)
    discount_amount_cents = Column(Integer, default=0)
    promo_code = Column(String, nullable=True)
    shipping_address = Column(JSONB, nullable=True)
    contact_info = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index('ix_order_status_expires_at', 'status', 'expires_at'),
    )

    user = relationship("User", backref="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order")

class OrderItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("order.id"), nullable=False)
    sku_id = Column(Integer, ForeignKey("sku.id"), nullable=False)
    title = Column(String, nullable=False)
    sku_info = Column(String, nullable=True)

    price_cents = Column(Integer, nullable=False)
    quantity = Column(Integer, default=1)

    order = relationship("Order", back_populates="items")
    sku = relationship("SKU")

class Payment(Base):
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("order.id"), nullable=False)
    external_id = Column(String, nullable=True)
    amount_cents = Column(Integer, nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    provider_response = Column(JSONB, nullable=True)

    order = relationship("Order", back_populates="payments")
