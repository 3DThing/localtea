"""
Promo code management API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.models.user import User
from admin_backend.core.deps import get_current_admin
from admin_backend.crud.crud_promo_code import promo_code_crud
from admin_backend.schemas import promo_code as schemas
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()


@router.get("", response_model=schemas.PromoCodeListResponse)
async def list_promo_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_active: Optional[bool] = None,
    is_valid: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get list of promo codes.
    
    - **is_active**: filter by active status
    - **is_valid**: filter by current validity (checks dates and usage limits)
    - **q**: search in code and description
    """
    items, total = await promo_code_crud.get_multi(
        db, 
        skip=skip, 
        limit=limit, 
        is_active=is_active,
        is_valid=is_valid,
        q=q
    )
    
    response_items = [
        schemas.PromoCodeResponse(
            **{
                "id": p.id,
                "code": p.code,
                "description": p.description,
                "discount_type": p.discount_type.value,
                "discount_value": p.discount_value,
                "min_order_amount_cents": p.min_order_amount_cents,
                "max_discount_cents": p.max_discount_cents,
                "usage_limit": p.usage_limit,
                "usage_limit_per_user": p.usage_limit_per_user,
                "valid_from": p.valid_from,
                "valid_until": p.valid_until,
                "is_active": p.is_active,
                "usage_count": p.usage_count,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
                "is_valid": p.is_valid(),
            }
        )
        for p in items
    ]
    
    return schemas.PromoCodeListResponse(items=response_items, total=total)


@router.get("/{promo_id}", response_model=schemas.PromoCodeResponse)
async def get_promo_code(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get promo code by ID."""
    promo = await promo_code_crud.get(db, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    return schemas.PromoCodeResponse(
        id=promo.id,
        code=promo.code,
        description=promo.description,
        discount_type=promo.discount_type.value,
        discount_value=promo.discount_value,
        min_order_amount_cents=promo.min_order_amount_cents,
        max_discount_cents=promo.max_discount_cents,
        usage_limit=promo.usage_limit,
        usage_limit_per_user=promo.usage_limit_per_user,
        valid_from=promo.valid_from,
        valid_until=promo.valid_until,
        is_active=promo.is_active,
        usage_count=promo.usage_count,
        created_at=promo.created_at,
        updated_at=promo.updated_at,
        is_valid=promo.is_valid(),
    )


@router.post("", response_model=schemas.PromoCodeResponse, status_code=201)
async def create_promo_code(
    promo_in: schemas.PromoCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Create a new promo code."""
    # Check if code already exists
    existing = await promo_code_crud.get_by_code(db, promo_in.code)
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    promo = await promo_code_crud.create(db, obj_in=promo_in)
    
    await log_admin_action(
        db, current_user.id, "create", "promo_code", promo.id,
        f"Created promo code {promo.code}"
    )
    
    return schemas.PromoCodeResponse(
        id=promo.id,
        code=promo.code,
        description=promo.description,
        discount_type=promo.discount_type.value,
        discount_value=promo.discount_value,
        min_order_amount_cents=promo.min_order_amount_cents,
        max_discount_cents=promo.max_discount_cents,
        usage_limit=promo.usage_limit,
        usage_limit_per_user=promo.usage_limit_per_user,
        valid_from=promo.valid_from,
        valid_until=promo.valid_until,
        is_active=promo.is_active,
        usage_count=promo.usage_count,
        created_at=promo.created_at,
        updated_at=promo.updated_at,
        is_valid=promo.is_valid(),
    )


@router.patch("/{promo_id}", response_model=schemas.PromoCodeResponse)
async def update_promo_code(
    promo_id: int,
    promo_in: schemas.PromoCodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Update a promo code."""
    promo = await promo_code_crud.get(db, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    promo = await promo_code_crud.update(db, db_obj=promo, obj_in=promo_in)
    
    await log_admin_action(
        db, current_user.id, "update", "promo_code", promo.id,
        f"Updated promo code {promo.code}"
    )
    
    return schemas.PromoCodeResponse(
        id=promo.id,
        code=promo.code,
        description=promo.description,
        discount_type=promo.discount_type.value,
        discount_value=promo.discount_value,
        min_order_amount_cents=promo.min_order_amount_cents,
        max_discount_cents=promo.max_discount_cents,
        usage_limit=promo.usage_limit,
        usage_limit_per_user=promo.usage_limit_per_user,
        valid_from=promo.valid_from,
        valid_until=promo.valid_until,
        is_active=promo.is_active,
        usage_count=promo.usage_count,
        created_at=promo.created_at,
        updated_at=promo.updated_at,
        is_valid=promo.is_valid(),
    )


@router.delete("/{promo_id}")
async def delete_promo_code(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete a promo code."""
    promo = await promo_code_crud.get(db, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    code = promo.code
    await promo_code_crud.delete(db, id=promo_id)
    
    await log_admin_action(
        db, current_user.id, "delete", "promo_code", promo_id,
        f"Deleted promo code {code}"
    )
    
    return {"message": "Promo code deleted"}


@router.post("/validate", response_model=schemas.PromoCodeValidateResponse)
async def validate_promo_code(
    data: schemas.PromoCodeValidate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Validate a promo code and calculate discount.
    
    Used for testing promo codes in admin panel.
    """
    valid, discount, message, promo = await promo_code_crud.validate_and_calculate(
        db, data.code, data.order_amount_cents
    )
    
    promo_response = None
    if promo:
        promo_response = schemas.PromoCodeResponse(
            id=promo.id,
            code=promo.code,
            description=promo.description,
            discount_type=promo.discount_type.value,
            discount_value=promo.discount_value,
            min_order_amount_cents=promo.min_order_amount_cents,
            max_discount_cents=promo.max_discount_cents,
            usage_limit=promo.usage_limit,
            usage_limit_per_user=promo.usage_limit_per_user,
            valid_from=promo.valid_from,
            valid_until=promo.valid_until,
            is_active=promo.is_active,
            usage_count=promo.usage_count,
            created_at=promo.created_at,
            updated_at=promo.updated_at,
            is_valid=promo.is_valid(),
        )
    
    return schemas.PromoCodeValidateResponse(
        valid=valid,
        discount_amount_cents=discount,
        message=message,
        promo_code=promo_response
    )


@router.post("/{promo_id}/toggle")
async def toggle_promo_code(
    promo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Toggle promo code active status."""
    promo = await promo_code_crud.get(db, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    promo.is_active = not promo.is_active
    db.add(promo)
    await db.commit()
    
    status = "activated" if promo.is_active else "deactivated"
    await log_admin_action(
        db, current_user.id, "toggle", "promo_code", promo_id,
        f"Promo code {promo.code} {status}"
    )
    
    return {"message": f"Promo code {status}", "is_active": promo.is_active}
