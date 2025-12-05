from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps, deps_interactions
from backend.crud.crud_catalog import catalog as crud_catalog
from backend.crud import crud_interactions
from backend.schemas import catalog as catalog_schemas
from backend.core import cache
from backend.models.user import User
import math
from datetime import datetime, timezone

router = APIRouter()

@router.get("/categories", response_model=List[catalog_schemas.CategoryTree])
async def get_categories(
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get category tree.
    """
    return await crud_catalog.get_category_tree(db)

@router.get("/products", response_model=catalog_schemas.ProductListResponse)
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    tea_type: Optional[str] = None,
    sort: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get products list with pagination and filtering.
    """
    items, total = await crud_catalog.get_products(
        db, 
        page=page, 
        limit=limit, 
        category_id=category_id, 
        tea_type=tea_type, 
        sort=sort, 
        q=q
    )
    
    pages = math.ceil(total / limit) if limit > 0 else 0
    
    return catalog_schemas.ProductListResponse(
        items=items,
        total=total,
        page=page,
        pages=pages
    )

@router.get("/products/{slug}", response_model=catalog_schemas.ProductDetail)
async def get_product_detail(
    request: Request,
    slug: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps_interactions.get_current_user_optional),
) -> Any:
    """
    Get product detail by slug.
    """
    product = await crud_catalog.get_product_by_slug(db, slug=slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Fetch counters from Redis
    counters = await cache.get_counters("product", product.id)
    product.views_count = max(product.views_count or 0, counters["views_count"])
    product.likes_count = max(product.likes_count or 0, counters["likes_count"])
    
    if product.created_at is None:
        product.created_at = datetime.now(timezone.utc)
    if product.comments_count is None:
        product.comments_count = 0

    # Check is_liked
    if current_user:
        is_liked = await crud_interactions.interactions.is_liked(db, user_id=current_user.id, product_id=product.id)
    else:
        fingerprint = deps_interactions.get_fingerprint(request)
        is_liked = await crud_interactions.interactions.is_liked(db, fingerprint=fingerprint, product_id=product.id)
        
    product.is_liked = is_liked
    
    return product

@router.get("/skus/{id}", response_model=catalog_schemas.SKU)
async def get_sku_detail(
    id: int,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get SKU detail by ID.
    """
    sku = await crud_catalog.get_sku(db, sku_id=id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku
