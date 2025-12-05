from typing import List, Optional, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.crud.base import CRUDBase
from backend.models.blog import Article
from admin_backend.schemas.blog import ArticleCreate, ArticleUpdate


class CRUDArticle(CRUDBase[Article, ArticleCreate, ArticleUpdate]):
    """CRUD операции для статей блога в админке"""
    
    async def get_with_author(self, db: AsyncSession, *, id: int) -> Optional[Article]:
        """Получить статью с автором"""
        query = (
            select(Article)
            .options(selectinload(Article.author))
            .where(Article.id == id)
        )
        result = await db.execute(query)
        return result.scalars().first()
    
    async def get_by_slug(self, db: AsyncSession, *, slug: str) -> Optional[Article]:
        """Получить статью по slug"""
        result = await db.execute(select(Article).where(Article.slug == slug))
        return result.scalars().first()
    
    async def get_multi_with_author(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_published: Optional[bool] = None,
    ) -> Tuple[List[Article], int]:
        """
        Получить список статей с авторами и пагинацией.
        Возвращает кортеж (список статей, общее количество).
        """
        query = select(Article).options(selectinload(Article.author))
        count_query = select(func.count()).select_from(Article)
        
        # Фильтрация по поиску
        if search:
            search_filter = Article.title.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        
        # Фильтрация по статусу публикации
        if is_published is not None:
            query = query.where(Article.is_published == is_published)
            count_query = count_query.where(Article.is_published == is_published)
        
        # Общее количество
        total = await db.scalar(count_query)
        
        # Сортировка и пагинация
        query = query.order_by(Article.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        articles = result.scalars().all()
        
        return list(articles), total or 0
    
    async def create_with_author(
        self,
        db: AsyncSession,
        *,
        obj_in: ArticleCreate,
        author_id: int
    ) -> Article:
        """Создать статью с привязкой к автору"""
        db_obj = Article(
            title=obj_in.title,
            slug=obj_in.slug,
            content=obj_in.content,
            preview_image=obj_in.preview_image,
            is_published=obj_in.is_published,
            author_id=author_id,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def publish(self, db: AsyncSession, *, db_obj: Article) -> Article:
        """Опубликовать статью"""
        db_obj.is_published = True
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def unpublish(self, db: AsyncSession, *, db_obj: Article) -> Article:
        """Снять статью с публикации"""
        db_obj.is_published = False
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


article = CRUDArticle(Article)
