from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from backend.db.base_class import Base
from datetime import datetime, timezone
import enum

class OrderStatus(str, enum.Enum):
    AWAITING_PAYMENT = "awaiting_payment"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PaymentStatus(str, enum.Enum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    PENDING = "pending"

class DeliveryMethod(str, enum.Enum):
    PICKUP = "pickup"           # Самовывоз
    RUSSIAN_POST = "russian_post"  # Почта России

class Order(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    session_id = Column(String, nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.AWAITING_PAYMENT, nullable=False)
    total_amount_cents = Column(Integer, nullable=False)  # Сумма товаров
    delivery_cost_cents = Column(Integer, default=0)      # Стоимость доставки
    discount_amount_cents = Column(Integer, default=0)
    promo_code = Column(String, nullable=True)
    
    # Метод доставки
    delivery_method = Column(Enum(DeliveryMethod), default=DeliveryMethod.PICKUP, nullable=False)
    
    # Данные получателя (JSONB для гибкости)
    # contact_info: {firstname, lastname, middlename, phone, email}
    contact_info = Column(JSONB, nullable=True)
    
    # Адрес доставки (JSONB)
    # shipping_address: {address, postal_code, city}
    shipping_address = Column(JSONB, nullable=True)
    
    # Трек-номер (для Почты России)
    tracking_number = Column(String, nullable=True)
    
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
