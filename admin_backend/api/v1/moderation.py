"""
Content moderation API endpoints.
Manage comments, reports, and user bans.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from backend.db.session import get_db
from backend.models.user import User
from backend.models.interactions import Comment, Report
from admin_backend.core.deps import get_current_admin
from admin_backend.schemas import moderation as schemas
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()


# --- Comments ---

@router.get("/comments", response_model=schemas.CommentListResponse)
async def list_comments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = None,
    article_id: Optional[int] = None,
    product_id: Optional[int] = None,
    has_reports: Optional[bool] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get list of comments for moderation.
    
    - **user_id**: filter by author
    - **article_id/product_id**: filter by target
    - **has_reports**: only comments with reports
    - **q**: search in content
    """
    query = select(Comment).options(selectinload(Comment.user))
    
    if user_id:
        query = query.where(Comment.user_id == user_id)
    if article_id:
        query = query.where(Comment.article_id == article_id)
    if product_id:
        query = query.where(Comment.product_id == product_id)
    if q:
        query = query.where(Comment.content.ilike(f"%{q}%"))
    
    # Filter by reports
    if has_reports:
        subquery = select(Report.comment_id).distinct()
        query = query.where(Comment.id.in_(subquery))
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Paginate
    query = query.order_by(Comment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    comments = result.scalars().all()
    
    # Add reports count
    items = []
    for comment in comments:
        reports_count = await db.scalar(
            select(func.count()).where(Report.comment_id == comment.id)
        ) or 0
        
        item = schemas.CommentModerationResponse(
            id=comment.id,
            content=comment.content,
            user_id=comment.user_id,
            user=schemas.CommentAuthor(
                id=comment.user.id,
                username=comment.user.username,
                email=comment.user.email,
                avatar_url=comment.user.avatar_url,
                is_banned=not comment.user.is_active
            ) if comment.user else None,
            article_id=comment.article_id,
            product_id=comment.product_id,
            likes_count=comment.likes_count,
            reports_count=reports_count,
            created_at=comment.created_at
        )
        items.append(item)
    
    return schemas.CommentListResponse(items=items, total=total)


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Delete a comment by ID."""
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Delete associated reports
    await db.execute(delete(Report).where(Report.comment_id == comment_id))
    
    # Delete comment
    await db.delete(comment)
    await db.commit()
    
    await log_admin_action(
        db, current_user.id, "delete", "comment", comment_id,
        f"Deleted comment (user_id={comment.user_id})"
    )
    
    return {"message": "Comment deleted"}


# --- Reports ---

@router.get("/reports", response_model=schemas.ReportListResponse)
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[schemas.ReportStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get list of comment reports.
    
    - **status**: filter by status (new, resolved, rejected)
    """
    query = select(Report).options(
        selectinload(Report.comment).selectinload(Comment.user)
    )
    
    if status:
        query = query.where(Report.status == status.value)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Paginate
    query = query.order_by(Report.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()
    
    items = []
    for report in reports:
        comment_response = None
        if report.comment:
            comment_response = schemas.CommentModerationResponse(
                id=report.comment.id,
                content=report.comment.content,
                user_id=report.comment.user_id,
                user=schemas.CommentAuthor(
                    id=report.comment.user.id,
                    username=report.comment.user.username,
                    email=report.comment.user.email,
                    avatar_url=report.comment.user.avatar_url,
                    is_banned=not report.comment.user.is_active
                ) if report.comment.user else None,
                article_id=report.comment.article_id,
                product_id=report.comment.product_id,
                likes_count=report.comment.likes_count,
                reports_count=0,
                created_at=report.comment.created_at
            )
        
        items.append(schemas.ReportResponse(
            id=report.id,
            user_id=report.user_id,
            comment_id=report.comment_id,
            reason=report.reason,
            status=report.status,
            created_at=report.created_at,
            comment=comment_response
        ))
    
    return schemas.ReportListResponse(items=items, total=total)


@router.post("/reports/{report_id}/resolve")
async def resolve_report(
    report_id: int,
    resolve_data: schemas.ReportResolve,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Resolve a report.
    
    Actions:
    - **resolve**: Mark as resolved (no action on comment)
    - **reject**: Reject the report
    - **delete_comment**: Delete the reported comment
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status != "new":
        raise HTTPException(status_code=400, detail="Report already processed")
    
    if resolve_data.action == "delete_comment":
        # Delete the comment
        comment = await db.get(Comment, report.comment_id)
        if comment:
            await db.execute(delete(Report).where(Report.comment_id == report.comment_id))
            await db.delete(comment)
        report.status = "resolved"
        action_log = "Deleted comment"
    elif resolve_data.action == "resolve":
        report.status = "resolved"
        action_log = "Resolved without action"
    else:  # reject
        report.status = "rejected"
        action_log = "Rejected report"
    
    db.add(report)
    await db.commit()
    
    await log_admin_action(
        db, current_user.id, "resolve", "report", report_id,
        f"{action_log}: {resolve_data.reason or 'no reason'}"
    )
    
    return {"message": "Report processed", "status": report.status}


# --- User Bans ---

@router.post("/users/{user_id}/ban", response_model=schemas.UserBanResponse)
async def ban_user(
    user_id: int,
    ban_data: schemas.UserBanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Ban a user.
    
    Sets is_active=False which prevents login.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_superuser:
        raise HTTPException(status_code=400, detail="Cannot ban admin users")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is already banned")
    
    user.is_active = False
    db.add(user)
    await db.commit()
    
    await log_admin_action(
        db, current_user.id, "ban", "user", user_id,
        f"Banned user {user.email}: {ban_data.reason}"
    )
    
    return schemas.UserBanResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_banned=True,
        ban_reason=ban_data.reason,
        banned_at=datetime.now(timezone.utc),
        ban_until=ban_data.ban_until
    )


@router.post("/users/{user_id}/unban", response_model=schemas.UserBanResponse)
async def unban_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Unban a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="User is not banned")
    
    user.is_active = True
    db.add(user)
    await db.commit()
    
    await log_admin_action(
        db, current_user.id, "unban", "user", user_id,
        f"Unbanned user {user.email}"
    )
    
    return schemas.UserBanResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_banned=False,
        ban_reason=None,
        banned_at=None,
        ban_until=None
    )


@router.get("/users/banned", response_model=schemas.CommentListResponse)
async def list_banned_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get list of banned users."""
    query = select(User).where(User.is_active == False, User.is_superuser == False)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    query = query.order_by(User.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    
    items = [
        schemas.UserBanResponse(
            id=u.id,
            email=u.email,
            username=u.username,
            is_banned=True,
            ban_reason=None,
            banned_at=u.updated_at,
            ban_until=None
        )
        for u in users
    ]
    
    return {"items": items, "total": total}
