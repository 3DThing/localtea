"""
CRUD operations for inventory management.
"""
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta

from backend.models.inventory import (
    InventoryCategory, 
    InventoryMaterial, 
    InventoryMovement,
    ProductStock,
    MovementType
)
from backend.models.catalog import Product, SKU, Category
from admin_backend.schemas.inventory import (
    InventoryCategoryCreate,
    InventoryCategoryUpdate,
    InventoryMaterialCreate,
    InventoryMaterialUpdate,
    MaterialStockAdjustment,
    ProductStockAdjustment,
    MovementTypeEnum
)


class CRUDInventoryCategory:
    """CRUD for inventory categories."""
    
    async def get(self, db: AsyncSession, id: int) -> Optional[InventoryCategory]:
        return await db.get(InventoryCategory, id)
    
    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[InventoryCategory]:
        result = await db.execute(
            select(InventoryCategory).where(InventoryCategory.name == name)
        )
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        q: Optional[str] = None
    ) -> Tuple[List[InventoryCategory], int]:
        query = select(InventoryCategory)
        
        if is_active is not None:
            query = query.where(InventoryCategory.is_active == is_active)
        
        if q:
            query = query.where(
                or_(
                    InventoryCategory.name.ilike(f"%{q}%"),
                    InventoryCategory.description.ilike(f"%{q}%")
                )
            )
        
        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0
        
        # Paginate
        query = query.order_by(InventoryCategory.sort_order, InventoryCategory.name)
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all()), total
    
    async def create(self, db: AsyncSession, obj_in: InventoryCategoryCreate) -> InventoryCategory:
        db_obj = InventoryCategory(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def update(
        self, 
        db: AsyncSession, 
        db_obj: InventoryCategory, 
        obj_in: InventoryCategoryUpdate
    ) -> InventoryCategory:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def delete(self, db: AsyncSession, id: int) -> bool:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
            return True
        return False
    
    async def get_materials_count(self, db: AsyncSession, category_id: int) -> int:
        result = await db.scalar(
            select(func.count()).where(InventoryMaterial.category_id == category_id)
        )
        return result or 0


class CRUDInventoryMaterial:
    """CRUD for inventory materials."""
    
    async def get(self, db: AsyncSession, id: int) -> Optional[InventoryMaterial]:
        result = await db.execute(
            select(InventoryMaterial)
            .options(selectinload(InventoryMaterial.category))
            .where(InventoryMaterial.id == id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_sku_code(self, db: AsyncSession, sku_code: str) -> Optional[InventoryMaterial]:
        result = await db.execute(
            select(InventoryMaterial).where(InventoryMaterial.sku_code == sku_code)
        )
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        is_low_stock: Optional[bool] = None,
        q: Optional[str] = None
    ) -> Tuple[List[InventoryMaterial], int]:
        query = select(InventoryMaterial).options(selectinload(InventoryMaterial.category))
        
        if category_id:
            query = query.where(InventoryMaterial.category_id == category_id)
        
        if is_active is not None:
            query = query.where(InventoryMaterial.is_active == is_active)
        
        if is_low_stock is not None:
            if is_low_stock:
                query = query.where(InventoryMaterial.quantity <= InventoryMaterial.min_quantity)
            else:
                query = query.where(InventoryMaterial.quantity > InventoryMaterial.min_quantity)
        
        if q:
            query = query.where(
                or_(
                    InventoryMaterial.name.ilike(f"%{q}%"),
                    InventoryMaterial.sku_code.ilike(f"%{q}%"),
                    InventoryMaterial.description.ilike(f"%{q}%")
                )
            )
        
        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0
        
        # Paginate
        query = query.order_by(InventoryMaterial.name)
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all()), total
    
    async def create(
        self, 
        db: AsyncSession, 
        obj_in: InventoryMaterialCreate,
        admin_id: Optional[int] = None
    ) -> InventoryMaterial:
        data = obj_in.model_dump()
        initial_quantity = data.pop('quantity', 0)
        
        db_obj = InventoryMaterial(**data, quantity=initial_quantity)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        
        # Log initial stock if > 0
        if initial_quantity > 0:
            movement = InventoryMovement(
                material_id=db_obj.id,
                movement_type=MovementType.INCOMING,
                quantity=initial_quantity,
                quantity_before=0,
                quantity_after=initial_quantity,
                reason="Начальный остаток",
                admin_id=admin_id
            )
            db.add(movement)
            await db.commit()
        
        return db_obj
    
    async def update(
        self, 
        db: AsyncSession, 
        db_obj: InventoryMaterial, 
        obj_in: InventoryMaterialUpdate
    ) -> InventoryMaterial:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def delete(self, db: AsyncSession, id: int) -> bool:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
            return True
        return False
    
    async def adjust_stock(
        self,
        db: AsyncSession,
        adjustment: MaterialStockAdjustment,
        admin_id: Optional[int] = None
    ) -> InventoryMaterial:
        """Adjust material stock and log the movement."""
        material = await self.get(db, adjustment.material_id)
        if not material:
            raise ValueError(f"Material {adjustment.material_id} not found")
        
        quantity_before = material.quantity
        quantity_after = quantity_before + adjustment.quantity
        
        if quantity_after < 0:
            raise ValueError(f"Insufficient stock. Available: {quantity_before}")
        
        material.quantity = quantity_after
        db.add(material)
        
        # Map enum
        movement_type = MovementType(adjustment.movement_type.value)
        
        # Log movement
        movement = InventoryMovement(
            material_id=material.id,
            movement_type=movement_type,
            quantity=adjustment.quantity,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            reason=adjustment.reason,
            admin_id=admin_id
        )
        db.add(movement)
        
        await db.commit()
        await db.refresh(material)
        return material


class CRUDProductStock:
    """CRUD for product SKU stock."""
    
    async def get(self, db: AsyncSession, sku_id: int) -> Optional[ProductStock]:
        """Get ProductStock by SKU ID.
        
        Note: quantity/reserved values should be taken from SKU table, not ProductStock.
        This returns ProductStock for warehouse settings only.
        """
        result = await db.execute(
            select(ProductStock)
            .options(selectinload(ProductStock.sku))
            .where(ProductStock.sku_id == sku_id)
        )
        return result.scalar_one_or_none()
    
    async def get_or_create(self, db: AsyncSession, sku_id: int) -> ProductStock:
        """Get or create ProductStock for a SKU.
        
        ProductStock is only for warehouse settings (min_quantity).
        Actual quantities are always taken from SKU table.
        """
        stock = await self.get(db, sku_id)
        if not stock:
            # Get SKU to validate it exists
            sku = await db.get(SKU, sku_id)
            if not sku:
                raise ValueError(f"SKU {sku_id} not found")
            
            # Create ProductStock with warehouse settings
            # Note: quantity/reserved are NOT used, SKU table is source of truth
            stock = ProductStock(
                sku_id=sku_id,
                quantity=0,  # Not used, kept for backward compatibility
                reserved=0,  # Not used, kept for backward compatibility
                min_quantity=0
            )
            db.add(stock)
            await db.commit()
            await db.refresh(stock)
        return stock
    
    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[int] = None,
        is_low_stock: Optional[bool] = None,
        q: Optional[str] = None
    ) -> Tuple[List[dict], int]:
        """Get product stock with product/SKU info.
        
        Takes actual quantities from SKU table (catalog), not from ProductStock.
        ProductStock is used only for warehouse settings (min_quantity, etc).
        """
        # Build query from SKU (source of truth for quantities)
        query = (
            select(SKU, Product)
            .join(Product, SKU.product_id == Product.id)
            .where(SKU.is_active == True)
        )
        
        if category_id:
            query = query.where(Product.category_id == category_id)
        
        if q:
            query = query.where(
                or_(
                    Product.title.ilike(f"%{q}%"),
                    SKU.sku_code.ilike(f"%{q}%"),
                )
            )
        
        # Execute query
        result = await db.execute(query)
        all_skus = result.all()
        
        # For each SKU, get or create ProductStock settings (for min_quantity)
        items_with_stock = []
        for sku, product in all_skus:
            # Get ProductStock if exists (for warehouse settings)
            stock_result = await db.execute(
                select(ProductStock).where(ProductStock.sku_id == sku.id)
            )
            stock = stock_result.scalar_one_or_none()
            
            # If no ProductStock, create minimal object with defaults
            if not stock:
                stock = ProductStock(
                    sku_id=sku.id,
                    quantity=sku.quantity,  # Will be ignored, we use SKU.quantity
                    reserved=sku.reserved_quantity,
                    min_quantity=0
                )
            
            items_with_stock.append((stock, sku, product))
        
        # Filter by low stock if needed (using SKU.quantity as source of truth)
        if is_low_stock is not None:
            items_with_stock = [
                r for r in items_with_stock
                if is_low_stock == (r[1].quantity <= r[0].min_quantity and r[0].min_quantity > 0)
            ]
        
        total = len(items_with_stock)
        
        # Paginate in memory
        items = items_with_stock[skip:skip + limit]
        
        return items, total
    
    async def adjust_stock(
        self,
        db: AsyncSession,
        adjustment: ProductStockAdjustment,
        admin_id: Optional[int] = None,
        order_id: Optional[int] = None
    ) -> ProductStock:
        """Adjust product stock and log the movement.
        
        Updates SKU table (source of truth) and creates ProductStock if needed for settings.
        """
        # Get or create ProductStock (for settings only)
        stock = await self.get_or_create(db, adjustment.sku_id)
        
        # Get SKU (source of truth for quantities)
        sku = await db.get(SKU, adjustment.sku_id)
        if not sku:
            raise ValueError(f"SKU {adjustment.sku_id} not found")
        
        quantity_before = sku.quantity or 0
        quantity_after = quantity_before + adjustment.quantity
        
        if quantity_after < 0:
            raise ValueError(f"Insufficient stock. Available: {quantity_before}")
        
        # Update SKU table (source of truth)
        sku.quantity = quantity_after
        db.add(sku)
        
        # Keep ProductStock in sync (for backward compatibility)
        stock.quantity = quantity_after
        stock.reserved = sku.reserved_quantity or 0
        db.add(stock)
        
        # Map enum
        movement_type = MovementType(adjustment.movement_type.value)
        
        # Log movement
        movement = InventoryMovement(
            sku_id=adjustment.sku_id,
            movement_type=movement_type,
            quantity=adjustment.quantity,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            reason=adjustment.reason,
            admin_id=admin_id,
            order_id=order_id
        )
        db.add(movement)
        
        await db.commit()
        await db.refresh(stock)
        return stock


class CRUDInventoryMovement:
    """CRUD for inventory movements."""
    
    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        material_id: Optional[int] = None,
        sku_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Tuple[List[InventoryMovement], int]:
        query = select(InventoryMovement)
        
        if material_id:
            query = query.where(InventoryMovement.material_id == material_id)
        
        if sku_id:
            query = query.where(InventoryMovement.sku_id == sku_id)
        
        if movement_type:
            query = query.where(InventoryMovement.movement_type == MovementType(movement_type))
        
        if date_from:
            query = query.where(InventoryMovement.created_at >= date_from)
        
        if date_to:
            query = query.where(InventoryMovement.created_at <= date_to)
        
        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0
        
        # Paginate
        query = query.order_by(InventoryMovement.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all()), total
    
    async def get_stats(
        self,
        db: AsyncSession,
        days: int = 30
    ) -> dict:
        """Get movement statistics for last N days."""
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Count by type
        type_counts = {}
        for mt in MovementType:
            count = await db.scalar(
                select(func.count()).where(
                    and_(
                        InventoryMovement.movement_type == mt,
                        InventoryMovement.created_at >= since
                    )
                )
            )
            type_counts[mt.value] = count or 0
        
        return type_counts


# Singleton instances
inventory_category_crud = CRUDInventoryCategory()
inventory_material_crud = CRUDInventoryMaterial()
product_stock_crud = CRUDProductStock()
inventory_movement_crud = CRUDInventoryMovement()
