"""
Inventory management schemas.
Extended with categories, materials, and movement logs.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


# ==================== Enums ====================

class MovementTypeEnum(str, Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    WRITE_OFF = "write_off"
    TRANSFER = "transfer"


# ==================== Categories ====================

class InventoryCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class InventoryCategoryCreate(InventoryCategoryBase):
    pass


class InventoryCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class InventoryCategoryResponse(InventoryCategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    materials_count: int = 0
    
    model_config = {"from_attributes": True}


class InventoryCategoryListResponse(BaseModel):
    items: List[InventoryCategoryResponse]
    total: int


# ==================== Materials ====================

class InventoryMaterialBase(BaseModel):
    category_id: int
    name: str = Field(..., min_length=1, max_length=255)
    sku_code: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    unit: str = Field("шт", max_length=50)
    min_quantity: float = Field(0, ge=0)
    cost_per_unit_cents: int = Field(0, ge=0)
    is_active: bool = True


class InventoryMaterialCreate(InventoryMaterialBase):
    quantity: float = Field(0, ge=0)


class InventoryMaterialUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku_code: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=50)
    min_quantity: Optional[float] = Field(None, ge=0)
    cost_per_unit_cents: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class InventoryMaterialResponse(InventoryMaterialBase):
    id: int
    quantity: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    category_name: Optional[str] = None
    is_low_stock: bool = False
    total_value_cents: int = 0
    
    model_config = {"from_attributes": True}


class InventoryMaterialListResponse(BaseModel):
    items: List[InventoryMaterialResponse]
    total: int


# ==================== Material Stock Adjustment ====================

class MaterialStockAdjustment(BaseModel):
    """Adjust material stock."""
    material_id: int
    quantity: float  # Positive for add, negative for remove
    movement_type: MovementTypeEnum
    reason: str = Field(..., min_length=1, max_length=500)


class BulkMaterialAdjustment(BaseModel):
    """Bulk adjust materials."""
    adjustments: List[MaterialStockAdjustment]


# ==================== Product Stock (SKU) ====================

class ProductStockResponse(BaseModel):
    """Product SKU stock info."""
    id: int
    sku_id: int
    sku_weight_grams: int
    sku_price_cents: int
    product_id: int
    product_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    quantity: int
    reserved: int = 0
    available: int = 0
    min_quantity: int = 0
    is_low_stock: bool = False
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class ProductStockListResponse(BaseModel):
    items: List[ProductStockResponse]
    total: int


class ProductStockAdjustment(BaseModel):
    """Adjust product SKU stock."""
    sku_id: int
    quantity: int  # Positive for add, negative for remove
    movement_type: MovementTypeEnum
    reason: str = Field(..., min_length=1, max_length=500)


class BulkProductStockAdjustment(BaseModel):
    """Bulk adjust product stock."""
    adjustments: List[ProductStockAdjustment]


# ==================== Movement Log ====================

class InventoryMovementResponse(BaseModel):
    """Movement log entry."""
    id: int
    material_id: Optional[int] = None
    material_name: Optional[str] = None
    sku_id: Optional[int] = None
    product_name: Optional[str] = None
    sku_weight_grams: Optional[int] = None
    movement_type: str
    quantity: float
    quantity_before: float
    quantity_after: float
    reason: str
    order_id: Optional[int] = None
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}


class InventoryMovementListResponse(BaseModel):
    items: List[InventoryMovementResponse]
    total: int


# ==================== Analytics ====================

class InventoryAnalytics(BaseModel):
    """Inventory analytics."""
    # Materials summary
    total_categories: int = 0
    total_materials: int = 0
    materials_total_value_cents: int = 0
    materials_low_stock_count: int = 0
    materials_out_of_stock_count: int = 0
    
    # Products summary
    total_product_skus: int = 0
    products_total_value_cents: int = 0
    products_low_stock_count: int = 0
    products_out_of_stock_count: int = 0
    
    # Catalog stats
    total_catalog_categories: int = 0
    total_catalog_products: int = 0
    products_total_stock: int = 0
    products_reserved_stock: int = 0
    products_available_stock: int = 0
    
    # Movement stats (last 30 days)
    movements_incoming_count: int = 0
    movements_outgoing_count: int = 0
    movements_adjustment_count: int = 0
    movements_return_count: int = 0
    movements_write_off_count: int = 0
    
    # Top materials by value
    top_materials_by_value: List[dict] = []
    
    # Top products by stock value
    top_products_by_value: List[dict] = []
    
    # Recent movements
    recent_movements: List[InventoryMovementResponse] = []


class CategoryAnalytics(BaseModel):
    """Analytics per category."""
    category_id: int
    category_name: str
    materials_count: int
    total_quantity: float
    total_value_cents: int
    low_stock_count: int


class CatalogCategoryAnalytics(BaseModel):
    """Analytics for catalog category."""
    category_id: int
    category_name: str
    products_count: int
    skus_count: int
    total_stock: int
    total_reserved: int
    total_available: int
    total_value_cents: int
    low_stock_count: int
    out_of_stock_count: int


class InventoryAnalyticsResponse(BaseModel):
    """Full analytics response."""
    summary: InventoryAnalytics
    categories_stats: List[CategoryAnalytics]
    catalog_categories_stats: List[CatalogCategoryAnalytics] = []


# ==================== Legacy Compatibility ====================

class SKUInventoryUpdate(BaseModel):
    """Update stock for a single SKU (legacy)."""
    sku_id: int
    stock_quantity: int = Field(..., ge=0)
    reason: Optional[str] = None


class BulkInventoryUpdate(BaseModel):
    """Bulk update stock for multiple SKUs (legacy)."""
    items: List[SKUInventoryUpdate]


class InventoryItem(BaseModel):
    """Inventory item with product info (legacy)."""
    sku_id: int
    sku_code: str
    product_id: int
    product_name: str
    weight_grams: int
    price_cents: int
    stock_quantity: int
    reserved_quantity: int = 0
    available_quantity: int = 0
    is_low_stock: bool = False
    last_updated: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class InventoryListResponse(BaseModel):
    items: List[InventoryItem]
    total: int


class InventorySummary(BaseModel):
    """Inventory summary statistics (legacy)."""
    total_skus: int
    total_products: int
    total_stock_value_cents: int
    low_stock_count: int
    out_of_stock_count: int
    avg_stock_per_sku: float
