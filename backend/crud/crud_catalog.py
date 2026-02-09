from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_
from sqlalchemy.orm import selectinload, joinedload
from backend.models.catalog import Category, Product, SKU, ProductImage
from backend.schemas import catalog as catalog_schemas

class CRUDCatalog:
    async def get_categories(self, db: AsyncSession) -> List[Category]:
        query = select(Category).where(Category.is_active == True).order_by(Category.id)
        result = await db.execute(query)
        categories = result.scalars().all()
        return categories

    async def get_category_tree(self, db: AsyncSession) -> List[catalog_schemas.CategoryTree]:
        categories = await self.get_categories(db)
        
        category_map = {}
        for c in categories:
            # Validate as basic Category first to avoid accessing 'children' relationship
            cat_base = catalog_schemas.Category.model_validate(c)
            # Create CategoryTree manually
            category_map[c.id] = catalog_schemas.CategoryTree(**cat_base.model_dump(), children=[])
            
        roots = []
        
        for cat in categories:
            if cat.parent_id:
                if cat.parent_id in category_map:
                    category_map[cat.parent_id].children.append(category_map[cat.id])
            else:
                roots.append(category_map[cat.id])
                
        return roots

    async def get_products(
        self, 
        db: AsyncSession, 
        *, 
        page: int = 1, 
        limit: int = 20,
        category_id: Optional[int] = None,
        tea_type: Optional[str] = None,
        sort: Optional[str] = None,
        q: Optional[str] = None
    ) -> Tuple[List[catalog_schemas.ProductListItem], int]:
        
        # Base query
        query = select(Product).where(Product.is_active == True)
        
        # Filters
        if category_id:
            # Include subcategories? For MVP let's stick to direct category or maybe simple check
            # If we want subcategories, we need to fetch children ids first.
            # For now, strict category match as per spec implication, or maybe we should include children.
            # Let's stick to strict match for simplicity unless specified otherwise.
            query = query.where(Product.category_id == category_id)
            
        if tea_type:
            query = query.where(Product.tea_type == tea_type)
            
        if q:
            # Simple ILIKE for MVP, full text search is better but requires setup
            search_filter = or_(
                Product.title.ilike(f"%{q}%"),
                Product.description.ilike(f"%{q}%")
            )
            query = query.where(search_filter)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()

        # Sorting
        # Sorting by price requires joining with SKU.
        # This is a bit complex because a product has multiple SKUs.
        # We usually sort by min_price of the product.
        
        if sort == 'new':
            query = query.order_by(desc(Product.created_at))
        elif sort == 'price_asc' or sort == 'price_desc':
            # We need to join with SKU to sort by price.
            # Subquery to find min price per product
            min_price_subquery = (
                select(SKU.product_id, func.min(SKU.price_cents).label("min_price"))
                .where(SKU.is_active == True, SKU.is_visible == True)
                .group_by(SKU.product_id)
                .subquery()
            )
            query = query.join(min_price_subquery, Product.id == min_price_subquery.c.product_id)
            
            if sort == 'price_asc':
                query = query.order_by(asc(min_price_subquery.c.min_price))
            else:
                query = query.order_by(desc(min_price_subquery.c.min_price))
        else:
            # Default sort
            query = query.order_by(desc(Product.created_at))

        # Pagination
        query = query.offset((page - 1) * limit).limit(limit)
        
        # Eager load for list display
        query = query.options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.skus)
        )

        result = await db.execute(query)
        products = result.scalars().all()
        
        # Transform to ProductListItem
        items = []
        for p in products:
            # Find main image
            main_image = next((img.url for img in p.images if img.is_main), None)
            if not main_image and p.images:
                main_image = p.images[0].url
                
            # Find min price
            # First try visible SKUs, then all active SKUs, then all SKUs
            visible_skus = [s for s in p.skus if s.is_active and s.is_visible]
            if visible_skus:
                min_price = min(s.price_cents for s in visible_skus)
            else:
                # Fallback: if no visible SKUs, use active SKUs
                active_skus = [s for s in p.skus if s.is_active]
                if active_skus:
                    min_price = min(s.price_cents for s in active_skus)
                else:
                    # Last resort: use any SKU
                    min_price = min((s.price_cents for s in p.skus), default=0)
            
            items.append(catalog_schemas.ProductListItem(
                id=p.id,
                title=p.title,
                slug=p.slug,
                tea_type=p.tea_type,
                main_image=main_image,
                min_price_cents=min_price,
                category=catalog_schemas.Category.model_validate(p.category)
            ))
            
        return items, total

    async def get_product_by_slug(self, db: AsyncSession, slug: str) -> Optional[Product]:
        query = select(Product).where(Product.slug == slug, Product.is_active == True).options(
            selectinload(Product.category),
            selectinload(Product.images),
            selectinload(Product.skus)
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def get_sku(self, db: AsyncSession, sku_id: int) -> Optional[SKU]:
        query = select(SKU).where(SKU.id == sku_id, SKU.is_active == True)
        result = await db.execute(query)
        return result.scalars().first()

catalog = CRUDCatalog()
