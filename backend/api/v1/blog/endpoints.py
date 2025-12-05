from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.crud import crud_blog, crud_interactions
from backend.schemas import blog as blog_schemas
from backend.dependencies import deps, deps_interactions
from backend.core import cache
from backend.models.user import User

router = APIRouter()

@router.get("/articles/", response_model=List[blog_schemas.Article])
async def read_articles(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
) -> Any:
    """
    Retrieve published articles.
    """
    articles = await crud_blog.article.get_multi_published(db, skip=skip, limit=limit, search=search)
    return articles

@router.get("/articles/{slug}", response_model=blog_schemas.Article)
async def read_article(
    request: Request,
    slug: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps_interactions.get_current_user_optional),
) -> Any:
    """
    Get article by slug.
    """
    article = await crud_blog.article.get_by_slug(db, slug=slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if not article.is_published:
        # Even if found, if not published, return 404 for public API
        raise HTTPException(status_code=404, detail="Article not found")
        
    # Fetch counters from Redis
    counters = await cache.get_counters("article", article.id)
    article.views_count = max(article.views_count, counters["views_count"])
    article.likes_count = max(article.likes_count, counters["likes_count"])
    
    # Check is_liked
    if current_user:
        is_liked = await crud_interactions.interactions.is_liked(db, user_id=current_user.id, article_id=article.id)
    else:
        fingerprint = deps_interactions.get_fingerprint(request)
        is_liked = await crud_interactions.interactions.is_liked(db, fingerprint=fingerprint, article_id=article.id)
        
    article.is_liked = is_liked
    
    return article

