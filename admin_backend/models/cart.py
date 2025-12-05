from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, func
from sqlalchemy.orm import relationship
from backend.db.base_class import Base
from datetime import datetime, timezone

class Cart(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    session_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint('num_nonnulls(user_id, session_id) = 1', name='check_cart_owner'),
    )

    user = relationship("User", backref="carts")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")

class CartItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    cart_id = Column(Integer, ForeignKey("cart.id"), nullable=False)
    sku_id = Column(Integer, ForeignKey("sku.id"), nullable=False)
    quantity = Column(Integer, default=1)
    fixed_price_cents = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('cart_id', 'sku_id', name='uq_cart_item_sku'),
    )

    cart = relationship("Cart", back_populates="items")
    sku = relationship("SKU")
