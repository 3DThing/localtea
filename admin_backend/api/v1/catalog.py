from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func
from backend.db.session import get_db
from backend.models.user import User
from backend.models.catalog import Product, Category
from admin_backend.core.deps import get_current_admin
from admin_backend.crud import crud_catalog
from admin_backend.schemas import catalog as schemas
from admin_backend.services.image_service import process_and_save_image
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()

# --- Categories ---
@router.get("/categories", response_model=List[schemas.Category]) # Should be Tree but for now flat list is easier to implement CRUD
async def read_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return await crud_catalog.category.get_all(db)

@router.post("/categories", response_model=schemas.Category)
async def create_category(
    category_in: schemas.CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    category = await crud_catalog.category.create(db, obj_in=category_in)
    await log_admin_action(db, current_user.id, "create", "category", category.id, f"Created category {category.name}")
    return category

@router.patch("/categories/{id}", response_model=schemas.Category)
async def update_category(
    id: int,
    category_in: schemas.CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    category = await crud_catalog.category.get(db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category = await crud_catalog.category.update(db, db_obj=category, obj_in=category_in)
    await log_admin_action(db, current_user.id, "update", "category", category.id, f"Updated category {category.name}")
    return category

@router.delete("/categories/{id}")
async def delete_category(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    category = await crud_catalog.category.get(db, id=id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for products in this category
    products_count = await db.scalar(select(func.count()).select_from(Product).where(Product.category_id == id))
    if products_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category containing products. Move or delete products first.")

    # Check for subcategories
    children_count = await db.scalar(select(func.count()).select_from(Category).where(Category.parent_id == id))
    if children_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category containing subcategories.")

    await db.delete(category)
    await db.commit()
    await log_admin_action(db, current_user.id, "delete", "category", id, f"Deleted category {category.name}")
    return {"message": "Category deleted"}

@router.post("/categories/image")
async def upload_category_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    url = process_and_save_image(file, subfolder="categories")
    return {"url": url}

# --- Products ---
@router.get("/products", response_model=List[schemas.Product])
async def read_products(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    return await crud_catalog.product.get_multi(db, skip=skip, limit=limit)

@router.post("/products", response_model=schemas.Product)
async def create_product(
    product_in: schemas.ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    try:
        product = await crud_catalog.product.create(db, obj_in=product_in)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Invalid category or other constraint violation")
    await log_admin_action(db, current_user.id, "create", "product", product.id, f"Created product {product.title}")
    return product

@router.get("/products/{id}", response_model=schemas.Product)
async def read_product(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    product = await crud_catalog.product.get(db, id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.patch("/products/{id}", response_model=schemas.Product)
async def update_product(
    id: int,
    product_in: schemas.ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    product = await crud_catalog.product.get(db, id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product = await crud_catalog.product.update(db, db_obj=product, obj_in=product_in)
    await log_admin_action(db, current_user.id, "update", "product", product.id, f"Updated product {product.title}")
    return product

@router.delete("/products/{id}")
async def delete_product(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    product = await crud_catalog.product.get(db, id=id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(product)
    await db.commit()
    await log_admin_action(db, current_user.id, "delete", "product", id, f"Deleted product {product.title}")
    return {"message": "Product deleted"}

# --- SKUs ---
@router.post("/products/{product_id}/skus", response_model=schemas.SKUUpdate)
async def create_sku(
    product_id: int,
    sku_in: schemas.SKUCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    # Ensure product exists
    product = await crud_catalog.product.get(db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create SKU (need to handle product_id injection if not in schema, but it is relationship)
    # SKUCreate doesn't have product_id, so we need to add it manually to the model creation
    # But CRUDBase.create takes obj_in.
    # We should probably update SKUCreate to include product_id or handle it in crud_catalog.
    
    # Let's do it manually here for simplicity or update schema
    # Better: update schema or use dict
    sku_data = sku_in.model_dump()
    sku_data["product_id"] = product_id
    
    # We can't use crud_catalog.sku.create directly if it expects schema without product_id
    # But we can pass dict to create if we modify CRUDBase or just instantiate model
    from backend.models.catalog import SKU
    db_sku = SKU(**sku_data)
    db.add(db_sku)
    await db.commit()
    await db.refresh(db_sku)
    await log_admin_action(db, current_user.id, "create", "sku", db_sku.id, f"Created SKU {db_sku.sku_code} for product {product_id}")
    return db_sku

@router.patch("/skus/{id}", response_model=schemas.SKUUpdate)
async def update_sku(
    id: int,
    sku_in: schemas.SKUUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    sku = await crud_catalog.sku.get(db, id=id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    sku = await crud_catalog.sku.update(db, db_obj=sku, obj_in=sku_in)
    await log_admin_action(db, current_user.id, "update", "sku", sku.id, f"Updated SKU {sku.sku_code}")
    return sku

@router.delete("/skus/{id}")
async def delete_sku(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    sku = await crud_catalog.sku.get(db, id=id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    await db.delete(sku)
    await db.commit()
    await log_admin_action(db, current_user.id, "delete", "sku", id, f"Deleted SKU {sku.sku_code}")
    return {"message": "SKU deleted"}

# --- Images ---
@router.post("/products/{product_id}/images")
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    is_main: bool = Form(False),
    sort_order: int = Form(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    product = await crud_catalog.product.get(db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    url = process_and_save_image(file, subfolder="products")
    
    image_in = schemas.ProductImageCreate(url=url, is_main=is_main, sort_order=sort_order)
    # Again, need to inject product_id
    image_data = image_in.model_dump()
    image_data["product_id"] = product_id
    
    from backend.models.catalog import ProductImage
    db_image = ProductImage(**image_data)
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    await log_admin_action(db, current_user.id, "create", "product_image", db_image.id, f"Uploaded image for product {product_id}")
    
    return db_image

@router.delete("/images/{id}")
async def delete_image(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    image = await crud_catalog.product_image.get(db, id=id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Optionally delete file from disk
    # os.remove(f"/app{image.url}")
    
    await db.delete(image)
    await db.commit()
    await log_admin_action(db, current_user.id, "delete", "product_image", id, f"Deleted image {id}")
    return {"message": "Image deleted"}
