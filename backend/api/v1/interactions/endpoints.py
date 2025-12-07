from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.crud import crud_interactions
from backend.schemas import interactions as schemas
from backend.dependencies import deps
from backend.dependencies import deps_interactions
from backend.models.user import User
from backend.core.limiter import limiter
from backend.core import cache

router = APIRouter()

@router.post("/comments/", response_model=schemas.Comment)
@router.post("/comments", response_model=schemas.Comment)
@limiter.limit("5/minute")
async def create_comment(
    request: Request,
    comment_in: schemas.CommentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new comment.
    """
    if not comment_in.article_id and not comment_in.product_id:
        raise HTTPException(status_code=400, detail="Either article_id or product_id must be provided")
    if comment_in.article_id and comment_in.product_id:
        raise HTTPException(status_code=400, detail="Cannot comment on both article and product")
        
    comment = await crud_interactions.interactions.create_comment(db, obj_in=comment_in, user_id=current_user.id)
    return comment

@router.get("/comments/", response_model=List[schemas.Comment])
@router.get("/comments", response_model=List[schemas.Comment])
async def read_comments(
    article_id: Optional[int] = None,
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get comments.
    """
    comments = await crud_interactions.interactions.get_comments(
        db, article_id=article_id, product_id=product_id, skip=skip, limit=limit
    )
    return comments

@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete comment. Only comment author or superuser can delete.
    """
    comment = await crud_interactions.interactions.get_comment(db, comment_id=comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check permission: author or admin
    if comment.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await crud_interactions.interactions.delete_comment(db, comment=comment)
    return None

@router.post("/likes/", response_model=schemas.LikeResponse)
@router.post("/likes", response_model=schemas.LikeResponse)
@limiter.limit("10/minute")
async def toggle_like(
    request: Request,
    like_in: schemas.LikeCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps_interactions.get_current_user_optional),
) -> Any:
    """
    Toggle like.
    """
    if not any([like_in.article_id, like_in.product_id, like_in.comment_id]):
        raise HTTPException(status_code=400, detail="Target id must be provided")
        
    fingerprint = deps_interactions.get_fingerprint(request)
    user_id = current_user.id if current_user else None
    
    result = await crud_interactions.interactions.toggle_like(
        db, obj_in=like_in, user_id=user_id, fingerprint=fingerprint
    )
    
    # Update Redis Cache
    if like_in.article_id:
        await cache.update_likes_cache("article", like_in.article_id, result["delta"])
    elif like_in.product_id:
        await cache.update_likes_cache("product", like_in.product_id, result["delta"])
        
    return result

@router.post("/views/")
@router.post("/views")
@limiter.limit("20/minute")
async def register_view(
    request: Request,
    view_in: schemas.ViewCreate,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Register view.
    """
    if view_in.article_id:
        await cache.incr_view("article", view_in.article_id)
    elif view_in.product_id:
        await cache.incr_view("product", view_in.product_id)
        
    return {"status": "ok"}

@router.post("/comments/{comment_id}/report", status_code=201)
async def report_comment(
    comment_id: int,
    report_in: schemas.ReportCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    await crud_interactions.interactions.create_report(
        db, obj_in=report_in, user_id=current_user.id, comment_id=comment_id
    )
    return {"status": "reported"}
