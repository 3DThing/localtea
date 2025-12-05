from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.crud.base import CRUDBase
from backend.models.blog import Article
from backend.schemas.blog import ArticleBase

class CRUDArticle(CRUDBase[Article, ArticleBase, ArticleBase]):
    async def get_by_slug(self, db: AsyncSession, *, slug: str) -> Optional[Article]:
        result = await db.execute(select(Article).where(Article.slug == slug))
        return result.scalars().first()

    async def get_multi_published(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, search: Optional[str] = None
    ) -> List[Article]:
        query = select(Article).where(Article.is_published == True)
        
        if search:
            query = query.where(Article.title.ilike(f"%{search}%"))
            
        query = query.offset(skip).limit(limit).order_by(Article.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

article = CRUDArticle(Article)
