from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- Category ---
class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    is_active: Optional[bool] = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    is_active: Optional[bool] = None

class Category(CategoryCreate):
    id: int
    # created_at removed as it is not in the model
    
    model_config = ConfigDict(from_attributes=True)

# --- SKU ---
class SKUCreate(BaseModel):
    sku_code: str
    weight: int
    price_cents: int
    discount_cents: Optional[int] = 0
    quantity: int
    is_active: Optional[bool] = True
    is_visible: Optional[bool] = True
    is_limited: Optional[bool] = False

class SKUUpdate(BaseModel):
    sku_code: Optional[str] = None
    weight: Optional[int] = None
    price_cents: Optional[int] = None
    discount_cents: Optional[int] = None
    quantity: Optional[int] = None
    is_active: Optional[bool] = None
    is_visible: Optional[bool] = None
    is_limited: Optional[bool] = None

class SKU(SKUCreate):
    id: int
    product_id: int
    # created_at removed
    
    model_config = ConfigDict(from_attributes=True)

# --- Product Image ---
class ProductImageCreate(BaseModel):
    url: str
    is_main: Optional[bool] = False
    sort_order: Optional[int] = 0

class ProductImageUpdate(BaseModel):
    is_main: Optional[bool] = None
    sort_order: Optional[int] = None

class ProductImage(ProductImageCreate):
    id: int
    product_id: int
    # created_at removed
    
    model_config = ConfigDict(from_attributes=True)

# --- Product ---
class ProductCreate(BaseModel):
    title: str
    slug: str
    tea_type: Optional[str] = None
    description: Optional[str] = None
    lore_description: Optional[str] = None
    brewing_guide: Optional[Dict[str, Any]] = None
    category_id: int
    is_active: Optional[bool] = True
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    tea_type: Optional[str] = None
    description: Optional[str] = None
    lore_description: Optional[str] = None
    brewing_guide: Optional[Dict[str, Any]] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None

class Product(ProductCreate):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Optional nested fields if needed, but for list view maybe not?
    # Let's include them as optional for detail view
    skus: List[SKU] = []
    images: List[ProductImage] = []
    
    model_config = ConfigDict(from_attributes=True)
