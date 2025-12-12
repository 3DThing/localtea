from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, delete, update
from backend.db.session import get_db
from backend.models.user import User
from backend.models.blog import Article
from backend.models.interactions import Comment, Like
from backend.models.order import Order
from backend.models.cart import Cart, CartItem
from backend.crud.crud_user import user as crud_user
from admin_backend.core.deps import get_current_admin
from admin_backend.schemas.user import UserAdminResponse, UserAdminUpdate, UserListResponse
from admin_backend.schemas.auth import Token
from admin_backend.crud import crud_admin_2fa
from admin_backend.services.audit_log import log_admin_action
from backend.core.security import create_access_token, create_refresh_token_str, create_csrf_token, get_token_hash
from backend.models.token import Token as DBToken
from backend.core.config import settings
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/", response_model=UserListResponse)
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    is_superuser: Optional[bool] = None,
    current_user: User = Depends(get_current_admin),
):
    query = select(User)
    if q:
        query = query.where(
            or_(
                User.email.ilike(f"%{q}%"),
                User.username.ilike(f"%{q}%"),
                User.firstname.ilike(f"%{q}%"),
                User.lastname.ilike(f"%{q}%")
            )
        )
    if is_superuser is not None:
        query = query.where(User.is_superuser == is_superuser)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Pagination
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return UserListResponse(items=items, total=total or 0)

@router.get("/{user_id}", response_model=UserAdminResponse)
async def read_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    user_in: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_in.model_dump(exclude_unset=True)

    if "password" in update_data:
        from backend.core.security import get_password_hash
        update_data["hashed_password"] = get_password_hash(update_data["password"])
        del update_data["password"]

    if "is_email_confirmed" in update_data:
        if update_data["is_email_confirmed"] and not user.is_email_confirmed:
             update_data["email_confirmed_at"] = datetime.now(timezone.utc)
             update_data["email_confirm_token"] = None
        elif not update_data["is_email_confirmed"]:
             update_data["email_confirmed_at"] = None

    user = await crud_user.update(db, db_obj=user, obj_in=update_data)

    await log_admin_action(db, current_user.id, "update", "user", user_id, f"Updated user {user.email}")
    return user

@router.post("/{user_id}/reset-2fa")
async def reset_2fa(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    if not current_user.is_superuser: # Double check, though get_current_admin checks it
         raise HTTPException(status_code=403, detail="Not enough privileges")
         
    admin_2fa = await crud_admin_2fa.get_by_user_id(db, user_id)
    if not admin_2fa:
        raise HTTPException(status_code=404, detail="2FA not set up for this user")
    
    # We can either delete the record or disable it. Deleting is cleaner for reset.
    await db.delete(admin_2fa)
    await db.commit()
    await log_admin_action(db, current_user.id, "delete", "admin_2fa", user_id, f"Reset 2FA for user {user_id}")
    return {"message": "2FA reset successfully"}

@router.post("/{user_id}/impersonate", response_model=Token)
async def impersonate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate tokens for the target user
    access_token = create_access_token(user.id)
    refresh_token_str = create_refresh_token_str()
    # Hash the refresh token before storing to prevent token exposure in case of database compromise
    refresh_token_hash = get_token_hash(refresh_token_str)
    csrf_token = create_csrf_token()
    
    # Save refresh token hash to DB (not the plain token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = DBToken(
        user_id=user.id,
        refresh_token=refresh_token_hash,
        csrf_token=csrf_token,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        user_agent="Admin Impersonation",
        ip="0.0.0.0"
    )
    db.add(db_token)
    await db.commit()
    
    await log_admin_action(db, current_user.id, "impersonate", "user", user_id, f"Impersonated user {user.email}")
    
    return Token(access_token=access_token, token_type="bearer", refresh_token=refresh_token_str)

@router.delete("/{user_id}", response_model=UserAdminResponse)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    # Cleanup dependencies
    # 1. Delete cart items
    cart_result = await db.execute(select(Cart.id).where(Cart.user_id == user_id))
    cart_ids = cart_result.scalars().all()
    if cart_ids:
        await db.execute(delete(CartItem).where(CartItem.cart_id.in_(cart_ids)))
    
    # 2. Delete cart
    await db.execute(delete(Cart).where(Cart.user_id == user_id))
    
    # 3. Detach orders
    await db.execute(update(Order).where(Order.user_id == user_id).values(user_id=None))
    
    # 4. Delete likes
    await db.execute(delete(Like).where(Like.user_id == user_id))
    
    # 5. Delete comments
    await db.execute(delete(Comment).where(Comment.user_id == user_id))
    
    # 6. Delete articles (and their dependencies if any - might need recursive cleanup if no cascade)
    # Check if user has articles
    articles_result = await db.execute(select(Article.id).where(Article.author_id == user_id))
    article_ids = articles_result.scalars().all()
    
    if article_ids:
        # Delete comments on these articles
        await db.execute(delete(Comment).where(Comment.article_id.in_(article_ids)))
        # Delete likes on these articles
        await db.execute(delete(Like).where(Like.article_id.in_(article_ids)))
        # Delete the articles
        await db.execute(delete(Article).where(Article.id.in_(article_ids)))

    # 7. Delete 2FA if exists
    await db.execute(delete(crud_admin_2fa.Admin2FA).where(crud_admin_2fa.Admin2FA.user_id == user_id))

    # 8. Delete tokens
    await db.execute(delete(DBToken).where(DBToken.user_id == user_id))

    user = await crud_user.remove(db, id=user_id)
    await log_admin_action(db, current_user.id, "delete", "user", user_id, f"Deleted user {user.email}")
    return user
