"""
Inventory models for warehouse management.
Includes categories, materials, products stock, and movement logs.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base_class import Base
import enum


class MovementType(str, enum.Enum):
    """Type of inventory movement."""
    INCOMING = "incoming"        # Приход
    OUTGOING = "outgoing"        # Расход
    ADJUSTMENT = "adjustment"    # Корректировка
    RETURN = "return"           # Возврат
    WRITE_OFF = "write_off"     # Списание
    TRANSFER = "transfer"       # Перемещение


class InventoryCategory(Base):
    """Category for inventory materials."""
    __tablename__ = "inventory_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    materials = relationship("InventoryMaterial", back_populates="category", cascade="all, delete-orphan")


class InventoryMaterial(Base):
    """Material in inventory (not a product SKU)."""
    __tablename__ = "inventory_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("inventory_categories.id"), nullable=False)
    
    name = Column(String(255), nullable=False)
    sku_code = Column(String(100), nullable=True, unique=True)  # Internal SKU for material
    description = Column(Text, nullable=True)
    unit = Column(String(50), default="шт")  # Unit of measurement (шт, кг, л, м, etc.)
    
    quantity = Column(Float, default=0)  # Current quantity
    min_quantity = Column(Float, default=0)  # Minimum stock level (for alerts)
    
    cost_per_unit_cents = Column(Integer, default=0)  # Cost per unit in kopecks
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("InventoryCategory", back_populates="materials")
    movements = relationship("InventoryMovement", back_populates="material", cascade="all, delete-orphan")


class InventoryMovement(Base):
    """Log of all inventory movements (materials and products)."""
    __tablename__ = "inventory_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Either material_id OR sku_id is set (not both)
    material_id = Column(Integer, ForeignKey("inventory_materials.id"), nullable=True)
    sku_id = Column(Integer, ForeignKey("sku.id"), nullable=True)
    
    movement_type = Column(Enum(MovementType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    quantity = Column(Float, nullable=False)  # Positive for incoming, negative for outgoing
    quantity_before = Column(Float, nullable=False)  # Quantity before movement
    quantity_after = Column(Float, nullable=False)   # Quantity after movement
    
    reason = Column(Text, nullable=True)  # Reason for the movement
    order_id = Column(Integer, ForeignKey("order.id"), nullable=True)  # If linked to an order
    
    admin_id = Column(Integer, ForeignKey("user.id"), nullable=True)  # Who made the change
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    material = relationship("InventoryMaterial", back_populates="movements")
    sku = relationship("SKU", backref="inventory_movements")
    admin = relationship("User", backref="inventory_movements")
    order = relationship("Order", backref="inventory_movements")


class ProductStock(Base):
    """Stock levels for product SKUs (linked to catalog)."""
    __tablename__ = "product_stock"
    
    id = Column(Integer, primary_key=True, index=True)
    sku_id = Column(Integer, ForeignKey("sku.id"), nullable=False, unique=True)
    
    quantity = Column(Integer, default=0)  # Current stock quantity
    reserved = Column(Integer, default=0)  # Reserved for pending orders
    min_quantity = Column(Integer, default=0)  # Minimum stock level
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Relationships
    sku = relationship("SKU", backref="stock")
    
    @property
    def available(self) -> int:
        """Available quantity (total minus reserved)."""
        return max(0, self.quantity - self.reserved)
