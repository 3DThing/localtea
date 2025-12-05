from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.models.catalog import Category, Product, SKU, ProductImage
from admin_backend.schemas.catalog import CategoryCreate, CategoryUpdate, ProductCreate, ProductUpdate, SKUCreate, SKUUpdate, ProductImageCreate, ProductImageUpdate
from backend.crud.base import CRUDBase

class CRUDCategory(CRUDBase[Category, CategoryCreate, CategoryUpdate]):
    async def get_all(self, db: AsyncSession) -> List[Category]:
        result = await db.execute(select(Category).order_by(Category.id))
        return result.scalars().all()

class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[Product]:
        query = select(Product).options(selectinload(Product.skus), selectinload(Product.images)).order_by(Product.id).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def get(self, db: AsyncSession, id: int) -> Optional[Product]:
        query = select(Product).options(selectinload(Product.skus), selectinload(Product.images)).where(Product.id == id)
        result = await db.execute(query)
        return result.scalars().first()
        
    async def create(self, db: AsyncSession, *, obj_in: ProductCreate) -> Product:
        db_obj = await super().create(db, obj_in=obj_in)
        return await self.get(db, db_obj.id)

    async def update(self, db: AsyncSession, *, db_obj: Product, obj_in: ProductUpdate | Dict[str, Any]) -> Product:
        db_obj = await super().update(db, db_obj=db_obj, obj_in=obj_in)
        return await self.get(db, db_obj.id)

class CRUDSKU(CRUDBase[SKU, SKUCreate, SKUUpdate]):
    async def get_by_product(self, db: AsyncSession, product_id: int) -> List[SKU]:
        result = await db.execute(select(SKU).where(SKU.product_id == product_id))
        return result.scalars().all()

class CRUDProductImage(CRUDBase[ProductImage, ProductImageCreate, ProductImageUpdate]):
    async def get_by_product(self, db: AsyncSession, product_id: int) -> List[ProductImage]:
        result = await db.execute(select(ProductImage).where(ProductImage.product_id == product_id).order_by(ProductImage.sort_order))
        return result.scalars().all()

category = CRUDCategory(Category)
product = CRUDProduct(Product)
sku = CRUDSKU(SKU)
product_image = CRUDProductImage(ProductImage)
