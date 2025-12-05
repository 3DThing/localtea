from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from backend.db.base_class import Base
from datetime import datetime, timezone

class Category(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("category.id"), nullable=True)
    description = Column(Text, nullable=True)
    image = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # SEO Fields
    seo_title = Column(String, nullable=True)
    seo_description = Column(String, nullable=True)

    parent = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")

class Product(Base):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    tea_type = Column(String, nullable=True) # Enum/String
    description = Column(Text, nullable=True)
    lore_description = Column(Text, nullable=True)
    brewing_guide = Column(JSONB, nullable=True)
    category_id = Column(Integer, ForeignKey("category.id"), nullable=False)
    
    views_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # SEO Fields
    seo_title = Column(String, nullable=True)
    seo_description = Column(String, nullable=True)
    seo_keywords = Column(String, nullable=True)

    category = relationship("Category", back_populates="products")
    skus = relationship("SKU", back_populates="product", cascade="all, delete-orphan")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")

    # Full Text Search Indexes (GIN) would be added via Alembic or specialized Index constructs if needed explicitly here,
    # but usually handled by migrations or specific dialect options. 
    # For now, we stick to standard definitions.

class SKU(Base):
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    sku_code = Column(String, unique=True, nullable=False)
    weight = Column(Integer, nullable=False) # grams
    price_cents = Column(Integer, nullable=False)
    discount_cents = Column(Integer, default=0)
    quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    is_limited = Column(Boolean, default=False)

    product = relationship("Product", back_populates="skus")

class ProductImage(Base):
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("product.id"), nullable=False)
    url = Column(String, nullable=False)
    is_main = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")
