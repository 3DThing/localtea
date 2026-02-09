"""
Inventory management API endpoints.
Supports categories, materials, product stock, and movement logs.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta

from backend.db.session import get_db
from backend.models.user import User
from backend.models.inventory import (
    InventoryCategory,
    InventoryMaterial,
    InventoryMovement,
    ProductStock,
    MovementType
)
from backend.models.catalog import Product, SKU, Category
from admin_backend.core.deps import get_current_admin
from admin_backend.crud.crud_inventory import (
    inventory_category_crud,
    inventory_material_crud,
    product_stock_crud,
    inventory_movement_crud
)
from admin_backend.schemas import inventory as schemas
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()


# ==================== Categories ====================

@router.get("/categories", response_model=schemas.InventoryCategoryListResponse)
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List inventory categories."""
    items, total = await inventory_category_crud.get_multi(
        db, skip=skip, limit=limit, is_active=is_active, q=q
    )
    
    response_items = []
    for cat in items:
        materials_count = await inventory_category_crud.get_materials_count(db, cat.id)
        response_items.append(schemas.InventoryCategoryResponse(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            is_active=cat.is_active,
            sort_order=cat.sort_order,
            created_at=cat.created_at,
            updated_at=cat.updated_at,
            materials_count=materials_count
        ))
    
    return schemas.InventoryCategoryListResponse(items=response_items, total=total)


@router.post("/categories", response_model=schemas.InventoryCategoryResponse, status_code=201)
async def create_category(
    category_in: schemas.InventoryCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create inventory category."""
    existing = await inventory_category_crud.get_by_name(db, category_in.name)
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = await inventory_category_crud.create(db, category_in)
    
    await log_admin_action(
        db, current_user.id, "create", "inventory_category", category.id,
        f"Created inventory category: {category.name}"
    )
    
    return schemas.InventoryCategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        sort_order=category.sort_order,
        created_at=category.created_at,
        updated_at=category.updated_at,
        materials_count=0
    )


@router.patch("/categories/{category_id}", response_model=schemas.InventoryCategoryResponse)
async def update_category(
    category_id: int,
    category_in: schemas.InventoryCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Update inventory category."""
    category = await inventory_category_crud.get(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category = await inventory_category_crud.update(db, category, category_in)
    materials_count = await inventory_category_crud.get_materials_count(db, category.id)
    
    await log_admin_action(
        db, current_user.id, "update", "inventory_category", category.id,
        f"Updated inventory category: {category.name}"
    )
    
    return schemas.InventoryCategoryResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        sort_order=category.sort_order,
        created_at=category.created_at,
        updated_at=category.updated_at,
        materials_count=materials_count
    )


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete inventory category."""
    category = await inventory_category_crud.get(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    materials_count = await inventory_category_crud.get_materials_count(db, category_id)
    if materials_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete category with {materials_count} materials. Move or delete materials first."
        )
    
    name = category.name
    await inventory_category_crud.delete(db, category_id)
    
    await log_admin_action(
        db, current_user.id, "delete", "inventory_category", category_id,
        f"Deleted inventory category: {name}"
    )
    
    return {"message": "Category deleted"}


# ==================== Materials ====================

@router.get("/materials", response_model=schemas.InventoryMaterialListResponse)
async def list_materials(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_low_stock: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List inventory materials."""
    items, total = await inventory_material_crud.get_multi(
        db, skip=skip, limit=limit, 
        category_id=category_id, is_active=is_active, 
        is_low_stock=is_low_stock, q=q
    )
    
    response_items = []
    for mat in items:
        response_items.append(schemas.InventoryMaterialResponse(
            id=mat.id,
            category_id=mat.category_id,
            name=mat.name,
            sku_code=mat.sku_code,
            description=mat.description,
            unit=mat.unit,
            quantity=mat.quantity,
            min_quantity=mat.min_quantity,
            cost_per_unit_cents=mat.cost_per_unit_cents,
            is_active=mat.is_active,
            created_at=mat.created_at,
            updated_at=mat.updated_at,
            category_name=mat.category.name if mat.category else None,
            is_low_stock=mat.quantity <= mat.min_quantity,
            total_value_cents=int(mat.quantity * mat.cost_per_unit_cents)
        ))
    
    return schemas.InventoryMaterialListResponse(items=response_items, total=total)


@router.get("/materials/{material_id}", response_model=schemas.InventoryMaterialResponse)
async def get_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get material by ID."""
    mat = await inventory_material_crud.get(db, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return schemas.InventoryMaterialResponse(
        id=mat.id,
        category_id=mat.category_id,
        name=mat.name,
        sku_code=mat.sku_code,
        description=mat.description,
        unit=mat.unit,
        quantity=mat.quantity,
        min_quantity=mat.min_quantity,
        cost_per_unit_cents=mat.cost_per_unit_cents,
        is_active=mat.is_active,
        created_at=mat.created_at,
        updated_at=mat.updated_at,
        category_name=mat.category.name if mat.category else None,
        is_low_stock=mat.quantity <= mat.min_quantity,
        total_value_cents=int(mat.quantity * mat.cost_per_unit_cents)
    )


@router.post("/materials", response_model=schemas.InventoryMaterialResponse, status_code=201)
async def create_material(
    material_in: schemas.InventoryMaterialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create inventory material."""
    # Validate category exists
    category = await inventory_category_crud.get(db, material_in.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    
    # Check SKU code uniqueness
    if material_in.sku_code:
        existing = await inventory_material_crud.get_by_sku_code(db, material_in.sku_code)
        if existing:
            raise HTTPException(status_code=400, detail="Material with this SKU code already exists")
    
    mat = await inventory_material_crud.create(db, material_in, admin_id=current_user.id)
    
    await log_admin_action(
        db, current_user.id, "create", "inventory_material", mat.id,
        f"Created material: {mat.name}, qty: {mat.quantity}"
    )
    
    # Refetch with category
    mat = await inventory_material_crud.get(db, mat.id)
    
    return schemas.InventoryMaterialResponse(
        id=mat.id,
        category_id=mat.category_id,
        name=mat.name,
        sku_code=mat.sku_code,
        description=mat.description,
        unit=mat.unit,
        quantity=mat.quantity,
        min_quantity=mat.min_quantity,
        cost_per_unit_cents=mat.cost_per_unit_cents,
        is_active=mat.is_active,
        created_at=mat.created_at,
        updated_at=mat.updated_at,
        category_name=mat.category.name if mat.category else None,
        is_low_stock=mat.quantity <= mat.min_quantity,
        total_value_cents=int(mat.quantity * mat.cost_per_unit_cents)
    )


@router.patch("/materials/{material_id}", response_model=schemas.InventoryMaterialResponse)
async def update_material(
    material_id: int,
    material_in: schemas.InventoryMaterialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Update material (not quantity - use adjust endpoint)."""
    mat = await inventory_material_crud.get(db, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    
    mat = await inventory_material_crud.update(db, mat, material_in)
    
    await log_admin_action(
        db, current_user.id, "update", "inventory_material", mat.id,
        f"Updated material: {mat.name}"
    )
    
    # Refetch with category
    mat = await inventory_material_crud.get(db, mat.id)
    
    return schemas.InventoryMaterialResponse(
        id=mat.id,
        category_id=mat.category_id,
        name=mat.name,
        sku_code=mat.sku_code,
        description=mat.description,
        unit=mat.unit,
        quantity=mat.quantity,
        min_quantity=mat.min_quantity,
        cost_per_unit_cents=mat.cost_per_unit_cents,
        is_active=mat.is_active,
        created_at=mat.created_at,
        updated_at=mat.updated_at,
        category_name=mat.category.name if mat.category else None,
        is_low_stock=mat.quantity <= mat.min_quantity,
        total_value_cents=int(mat.quantity * mat.cost_per_unit_cents)
    )


@router.delete("/materials/{material_id}")
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete material."""
    mat = await inventory_material_crud.get(db, material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")
    
    name = mat.name
    await inventory_material_crud.delete(db, material_id)
    
    await log_admin_action(
        db, current_user.id, "delete", "inventory_material", material_id,
        f"Deleted material: {name}"
    )
    
    return {"message": "Material deleted"}


@router.post("/materials/{material_id}/adjust", response_model=schemas.InventoryMaterialResponse)
async def adjust_material_stock(
    material_id: int,
    adjustment: schemas.MaterialStockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Adjust material stock quantity."""
    if adjustment.material_id != material_id:
        raise HTTPException(status_code=400, detail="Material ID mismatch")
    
    try:
        mat = await inventory_material_crud.adjust_stock(db, adjustment, admin_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    await log_admin_action(
        db, current_user.id, "adjust", "inventory_material", mat.id,
        f"Adjusted material {mat.name}: {'+' if adjustment.quantity >= 0 else ''}{adjustment.quantity} ({adjustment.reason})"
    )
    
    # Refetch with category
    mat = await inventory_material_crud.get(db, mat.id)
    
    return schemas.InventoryMaterialResponse(
        id=mat.id,
        category_id=mat.category_id,
        name=mat.name,
        sku_code=mat.sku_code,
        description=mat.description,
        unit=mat.unit,
        quantity=mat.quantity,
        min_quantity=mat.min_quantity,
        cost_per_unit_cents=mat.cost_per_unit_cents,
        is_active=mat.is_active,
        created_at=mat.created_at,
        updated_at=mat.updated_at,
        category_name=mat.category.name if mat.category else None,
        is_low_stock=mat.quantity <= mat.min_quantity,
        total_value_cents=int(mat.quantity * mat.cost_per_unit_cents)
    )


# ==================== Product Stock ====================

@router.get("/products", response_model=schemas.ProductStockListResponse)
async def list_product_stock(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: Optional[int] = None,
    is_low_stock: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List product SKU stock levels."""
    items, total = await product_stock_crud.get_multi(
        db, skip=skip, limit=limit,
        category_id=category_id, is_low_stock=is_low_stock, q=q
    )
    
    response_items = []
    for stock, sku, product in items:
        # Get category
        cat = await db.get(Category, product.category_id) if product.category_id else None
        
        # Use SKU quantities (catalog) as source of truth
        actual_quantity = sku.quantity or 0
        actual_reserved = sku.reserved_quantity or 0
        actual_available = max(0, actual_quantity - actual_reserved)
        
        response_items.append(schemas.ProductStockResponse(
            id=stock.id if stock.id else 0,
            sku_id=sku.id,
            sku_weight_grams=sku.weight,
            sku_price_cents=sku.price_cents,
            product_id=product.id,
            product_name=product.title,
            category_id=product.category_id,
            category_name=cat.name if cat else None,
            quantity=actual_quantity,
            reserved=actual_reserved,
            available=actual_available,
            min_quantity=stock.min_quantity if stock.min_quantity else 0,
            is_low_stock=actual_quantity <= stock.min_quantity and stock.min_quantity > 0,
            updated_at=stock.updated_at if stock.updated_at else None
        ))
    
    return schemas.ProductStockListResponse(items=response_items, total=total)


@router.post("/products/{sku_id}/adjust", response_model=schemas.ProductStockResponse)
async def adjust_product_stock(
    sku_id: int,
    adjustment: schemas.ProductStockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Adjust product SKU stock."""
    if adjustment.sku_id != sku_id:
        raise HTTPException(status_code=400, detail="SKU ID mismatch")
    
    # Verify SKU exists
    sku = await db.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    
    try:
        stock = await product_stock_crud.adjust_stock(db, adjustment, admin_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    product = await db.get(Product, sku.product_id)
    cat = await db.get(Category, product.category_id) if product and product.category_id else None
    
    await log_admin_action(
        db, current_user.id, "adjust", "product_stock", sku_id,
        f"Adjusted SKU {sku_id} stock: {'+' if adjustment.quantity >= 0 else ''}{adjustment.quantity} ({adjustment.reason})"
    )
    
    return schemas.ProductStockResponse(
        id=stock.id,
        sku_id=sku.id,
        sku_weight_grams=sku.weight,
        sku_price_cents=sku.price_cents,
        product_id=product.id if product else 0,
        product_name=product.title if product else "Unknown",
        category_id=product.category_id if product else None,
        category_name=cat.name if cat else None,
        quantity=stock.quantity,
        reserved=stock.reserved,
        available=stock.quantity - stock.reserved,
        min_quantity=stock.min_quantity,
        is_low_stock=stock.quantity <= stock.min_quantity,
        updated_at=stock.updated_at
    )


# ==================== Movement Log ====================

@router.get("/movements", response_model=schemas.InventoryMovementListResponse)
async def list_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    material_id: Optional[int] = None,
    sku_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List inventory movements."""
    movements, total = await inventory_movement_crud.get_multi(
        db, skip=skip, limit=limit,
        material_id=material_id, sku_id=sku_id,
        movement_type=movement_type,
        date_from=date_from, date_to=date_to
    )
    
    response_items = []
    for mov in movements:
        # Get related info
        material_name = None
        product_name = None
        sku_weight = None
        admin_name = None
        
        if mov.material_id:
            mat = await db.get(InventoryMaterial, mov.material_id)
            material_name = mat.name if mat else None
        
        if mov.sku_id:
            sku = await db.get(SKU, mov.sku_id)
            if sku:
                sku_weight = sku.weight
                product = await db.get(Product, sku.product_id)
                product_name = product.title if product else None
        
        if mov.admin_id:
            admin = await db.get(User, mov.admin_id)
            admin_name = f"{admin.firstname or ''} {admin.lastname or ''}".strip() or admin.email if admin else None
        
        response_items.append(schemas.InventoryMovementResponse(
            id=mov.id,
            material_id=mov.material_id,
            material_name=material_name,
            sku_id=mov.sku_id,
            product_name=product_name,
            sku_weight_grams=sku_weight,
            movement_type=mov.movement_type.value,
            quantity=mov.quantity,
            quantity_before=mov.quantity_before,
            quantity_after=mov.quantity_after,
            reason=mov.reason,
            order_id=mov.order_id,
            admin_id=mov.admin_id,
            admin_name=admin_name,
            created_at=mov.created_at
        ))
    
    return schemas.InventoryMovementListResponse(items=response_items, total=total)


# ==================== Analytics ====================

@router.get("/analytics", response_model=schemas.InventoryAnalyticsResponse)
async def get_inventory_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get inventory analytics."""
    # Categories count
    total_categories = await db.scalar(select(func.count(InventoryCategory.id))) or 0
    
    # Materials stats
    total_materials = await db.scalar(select(func.count(InventoryMaterial.id))) or 0
    materials_total_value = await db.scalar(
        select(func.sum(InventoryMaterial.quantity * InventoryMaterial.cost_per_unit_cents))
    ) or 0
    materials_low_stock = await db.scalar(
        select(func.count()).where(InventoryMaterial.quantity <= InventoryMaterial.min_quantity)
    ) or 0
    materials_out_of_stock = await db.scalar(
        select(func.count()).where(InventoryMaterial.quantity <= 0)
    ) or 0
    
    # Product stock stats - using SKU as source of truth
    total_skus = await db.scalar(
        select(func.count(SKU.id)).where(SKU.is_active == True)
    ) or 0
    
    # Product stock with prices - calculate total value from SKU
    products_total_value = await db.scalar(
        select(func.sum(SKU.quantity * SKU.price_cents)).where(SKU.is_active == True)
    ) or 0
    
    # Total stock from SKU (source of truth)
    total_products_stock = await db.scalar(
        select(func.sum(SKU.quantity)).where(SKU.is_active == True)
    ) or 0
    total_reserved = await db.scalar(
        select(func.sum(SKU.reserved_quantity)).where(SKU.is_active == True)
    ) or 0
    
    # Low stock: join with ProductStock to get min_quantity settings
    products_low_stock = await db.scalar(
        select(func.count())
        .select_from(SKU)
        .join(ProductStock, ProductStock.sku_id == SKU.id)
        .where(
            SKU.is_active == True,
            SKU.quantity <= ProductStock.min_quantity,
            ProductStock.min_quantity > 0
        )
    ) or 0
    products_out_of_stock = await db.scalar(
        select(func.count()).where(SKU.is_active == True, SKU.quantity <= 0)
    ) or 0
    
    # Catalog stats
    total_catalog_categories = await db.scalar(select(func.count(Category.id))) or 0
    total_catalog_products = await db.scalar(select(func.count(Product.id))) or 0
    
    # Movement stats (last 30 days)
    since = datetime.now(timezone.utc) - timedelta(days=30)
    movement_stats = await inventory_movement_crud.get_stats(db, days=30)
    
    # Top materials by value
    top_materials_result = await db.execute(
        select(InventoryMaterial)
        .order_by((InventoryMaterial.quantity * InventoryMaterial.cost_per_unit_cents).desc())
        .limit(10)
    )
    top_materials = [
        {"id": m.id, "name": m.name, "value_cents": int(m.quantity * m.cost_per_unit_cents)}
        for m in top_materials_result.scalars().all()
    ]
    
    # Top products by value (stock * price) - using SKU as source
    top_products_result = await db.execute(
        select(SKU, Product)
        .join(Product, SKU.product_id == Product.id)
        .where(SKU.is_active == True)
        .order_by((SKU.quantity * SKU.price_cents).desc())
        .limit(10)
    )
    top_products = []
    for sku, product in top_products_result.all():
        top_products.append({
            "id": sku.id,
            "sku_id": sku.id,
            "product_name": product.title,
            "weight_grams": sku.weight,
            "quantity": sku.quantity,
            "price_cents": sku.price_cents,
            "value_cents": int(sku.quantity * sku.price_cents)
        })
    
    # Recent movements
    recent_movements, _ = await inventory_movement_crud.get_multi(db, limit=10)
    recent_items = []
    for mov in recent_movements:
        material_name = None
        if mov.material_id:
            mat = await db.get(InventoryMaterial, mov.material_id)
            material_name = mat.name if mat else None
        
        recent_items.append(schemas.InventoryMovementResponse(
            id=mov.id,
            material_id=mov.material_id,
            material_name=material_name,
            sku_id=mov.sku_id,
            product_name=None,
            sku_weight_grams=None,
            movement_type=mov.movement_type.value,
            quantity=mov.quantity,
            quantity_before=mov.quantity_before,
            quantity_after=mov.quantity_after,
            reason=mov.reason,
            order_id=mov.order_id,
            admin_id=mov.admin_id,
            admin_name=None,
            created_at=mov.created_at
        ))
    
    # Category stats
    categories_result = await db.execute(select(InventoryCategory))
    categories_stats = []
    for cat in categories_result.scalars().all():
        mat_count = await inventory_category_crud.get_materials_count(db, cat.id)
        
        # Sum for category
        cat_qty = await db.scalar(
            select(func.sum(InventoryMaterial.quantity))
            .where(InventoryMaterial.category_id == cat.id)
        ) or 0
        cat_value = await db.scalar(
            select(func.sum(InventoryMaterial.quantity * InventoryMaterial.cost_per_unit_cents))
            .where(InventoryMaterial.category_id == cat.id)
        ) or 0
        cat_low = await db.scalar(
            select(func.count())
            .where(
                InventoryMaterial.category_id == cat.id,
                InventoryMaterial.quantity <= InventoryMaterial.min_quantity
            )
        ) or 0
        
        categories_stats.append(schemas.CategoryAnalytics(
            category_id=cat.id,
            category_name=cat.name,
            materials_count=mat_count,
            total_quantity=cat_qty,
            total_value_cents=int(cat_value),
            low_stock_count=cat_low
        ))
    
    # Catalog categories stats
    catalog_categories_result = await db.execute(select(Category))
    catalog_categories_stats = []
    for cat in catalog_categories_result.scalars().all():
        # Products count in category
        products_count = await db.scalar(
            select(func.count(Product.id))
            .where(Product.category_id == cat.id)
        ) or 0
        
        # SKUs count in category (via products)
        skus_count = await db.scalar(
            select(func.count(SKU.id))
            .join(Product, SKU.product_id == Product.id)
            .where(Product.category_id == cat.id)
        ) or 0
        
        # Stock stats for category - using SKU as source of truth
        cat_stock_stats = await db.execute(
            select(
                func.coalesce(func.sum(SKU.quantity), 0),
                func.coalesce(func.sum(SKU.reserved_quantity), 0),
                func.coalesce(func.sum(SKU.quantity * SKU.price_cents), 0)
            )
            .join(Product, SKU.product_id == Product.id)
            .where(Product.category_id == cat.id, SKU.is_active == True)
        )
        cat_stock_row = cat_stock_stats.first()
        cat_total_stock = int(cat_stock_row[0]) if cat_stock_row else 0
        cat_reserved = int(cat_stock_row[1]) if cat_stock_row else 0
        cat_value_cents = int(cat_stock_row[2]) if cat_stock_row else 0
        
        # Low stock count - join with ProductStock for min_quantity settings
        cat_low_stock = await db.scalar(
            select(func.count())
            .select_from(SKU)
            .join(Product, SKU.product_id == Product.id)
            .join(ProductStock, ProductStock.sku_id == SKU.id)
            .where(
                Product.category_id == cat.id,
                SKU.is_active == True,
                SKU.quantity <= ProductStock.min_quantity,
                ProductStock.min_quantity > 0
            )
        ) or 0
        
        # Out of stock count
        cat_out_of_stock = await db.scalar(
            select(func.count(SKU.id))
            .join(Product, SKU.product_id == Product.id)
            .where(
                Product.category_id == cat.id,
                SKU.is_active == True,
                SKU.quantity <= 0
            )
        ) or 0
        
        catalog_categories_stats.append(schemas.CatalogCategoryAnalytics(
            category_id=cat.id,
            category_name=cat.name,
            products_count=products_count,
            skus_count=skus_count,
            total_stock=cat_total_stock,
            total_reserved=cat_reserved,
            total_available=cat_total_stock - cat_reserved,
            total_value_cents=cat_value_cents,
            low_stock_count=cat_low_stock,
            out_of_stock_count=cat_out_of_stock
        ))
    
    summary = schemas.InventoryAnalytics(
        total_categories=total_categories,
        total_materials=total_materials,
        materials_total_value_cents=int(materials_total_value),
        materials_low_stock_count=materials_low_stock,
        materials_out_of_stock_count=materials_out_of_stock,
        total_product_skus=total_skus,
        products_total_value_cents=int(products_total_value),
        products_low_stock_count=products_low_stock,
        products_out_of_stock_count=products_out_of_stock,
        total_catalog_categories=total_catalog_categories,
        total_catalog_products=total_catalog_products,
        products_total_stock=int(total_products_stock),
        products_reserved_stock=int(total_reserved),
        products_available_stock=int(total_products_stock) - int(total_reserved),
        movements_incoming_count=movement_stats.get('incoming', 0),
        movements_outgoing_count=movement_stats.get('outgoing', 0),
        movements_adjustment_count=movement_stats.get('adjustment', 0),
        movements_return_count=movement_stats.get('return', 0),
        movements_write_off_count=movement_stats.get('write_off', 0),
        top_materials_by_value=top_materials,
        top_products_by_value=top_products,
        recent_movements=recent_items
    )
    
    return schemas.InventoryAnalyticsResponse(
        summary=summary,
        categories_stats=categories_stats,
        catalog_categories_stats=catalog_categories_stats
    )


# ==================== Legacy Endpoints ====================

@router.get("", response_model=schemas.InventoryListResponse)
async def list_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_low_stock: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List inventory (legacy - returns SKU stock)."""
    # For backward compatibility, return product stock
    items, total = await product_stock_crud.get_multi(
        db, skip=skip, limit=limit, is_low_stock=is_low_stock, q=q
    )
    
    response_items = []
    for stock, sku, product in items:
        response_items.append(schemas.InventoryItem(
            sku_id=sku.id,
            sku_code=sku.sku_code,
            product_id=product.id,
            product_name=product.title,
            weight_grams=sku.weight,
            price_cents=sku.price_cents,
            stock_quantity=stock.quantity,
            reserved_quantity=stock.reserved,
            available_quantity=stock.quantity - stock.reserved,
            is_low_stock=stock.quantity <= stock.min_quantity,
            last_updated=stock.updated_at
        ))
    
    return schemas.InventoryListResponse(items=response_items, total=total)


@router.get("/summary", response_model=schemas.InventorySummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get inventory summary (legacy)."""
    total_skus = await db.scalar(select(func.count(ProductStock.id))) or 0
    total_products = await db.scalar(select(func.count(Product.id))) or 0
    
    low_stock = await db.scalar(
        select(func.count()).where(ProductStock.quantity <= ProductStock.min_quantity)
    ) or 0
    out_of_stock = await db.scalar(
        select(func.count()).where(ProductStock.quantity <= 0)
    ) or 0
    
    return schemas.InventorySummary(
        total_skus=total_skus,
        total_products=total_products,
        total_stock_value_cents=0,
        low_stock_count=low_stock,
        out_of_stock_count=out_of_stock,
        avg_stock_per_sku=0
    )
