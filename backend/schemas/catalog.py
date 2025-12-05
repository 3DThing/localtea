from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None

class Category(CategoryBase):
    id: int
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

class CategoryTree(Category):
    children: List['CategoryTree'] = []

# --- SKU Schemas ---
class SKUBase(BaseModel):
    sku_code: str
    weight: int
    price_cents: int
    discount_cents: Optional[int] = 0
    quantity: int
    is_active: bool
    is_visible: bool
    is_limited: bool

class SKU(SKUBase):
    id: int
    reserved_quantity: int
    
    model_config = ConfigDict(from_attributes=True)

# --- Product Image Schemas ---
class ProductImageBase(BaseModel):
    url: str
    is_main: bool
    sort_order: int

class ProductImage(ProductImageBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# --- Product Schemas ---
class ProductBase(BaseModel):
    title: str
    slug: str
    tea_type: Optional[str] = None
    description: Optional[str] = None
    lore_description: Optional[str] = None
    brewing_guide: Optional[Dict[str, Any]] = None
    category_id: int
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    seo_keywords: Optional[str] = None

class Product(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    
    views_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False
    
    model_config = ConfigDict(from_attributes=True)

class ProductListItem(BaseModel):
    id: int
    title: str
    slug: str
    tea_type: Optional[str] = None
    main_image: Optional[str] = None
    min_price_cents: int
    category: Category
    
    model_config = ConfigDict(from_attributes=True)

class ProductListResponse(BaseModel):
    items: List[ProductListItem]
    total: int
    page: int
    pages: int

class ProductDetail(Product):
    images: List[ProductImage]
    skus: List[SKU]
    category: Category
