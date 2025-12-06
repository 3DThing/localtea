from typing import Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, update
from backend.models.interactions import Comment, Like, View, Report
from backend.models.blog import Article
from backend.models.catalog import Product
from backend.schemas.interactions import CommentCreate, LikeCreate, ReportCreate

class CRUDInteractions:
    async def create_comment(self, db: AsyncSession, *, obj_in: CommentCreate, user_id: int) -> Comment:
        db_obj = Comment(
            content=obj_in.content,
            user_id=user_id,
            article_id=obj_in.article_id,
            product_id=obj_in.product_id
        )
        db.add(db_obj)
        
        # Increment counter
        if obj_in.article_id:
            await db.execute(update(Article).where(Article.id == obj_in.article_id).values(comments_count=Article.comments_count + 1))
        elif obj_in.product_id:
            await db.execute(update(Product).where(Product.id == obj_in.product_id).values(comments_count=Product.comments_count + 1))
            
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_comments(self, db: AsyncSession, *, article_id: Optional[int] = None, product_id: Optional[int] = None, skip: int = 0, limit: int = 20):
        query = select(Comment)
        if article_id:
            query = query.where(Comment.article_id == article_id)
        if product_id:
            query = query.where(Comment.product_id == product_id)
            
        query = query.offset(skip).limit(limit).order_by(Comment.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    async def toggle_like(self, db: AsyncSession, *, obj_in: LikeCreate, user_id: Optional[int], fingerprint: Optional[str]) -> dict:
        # Check if like exists
        query = select(Like)
        if user_id:
            query = query.where(Like.user_id == user_id)
        else:
            query = query.where(Like.fingerprint == fingerprint)
            
        if obj_in.article_id:
            query = query.where(Like.article_id == obj_in.article_id)
            target_model = Article
            target_id = obj_in.article_id
        elif obj_in.product_id:
            query = query.where(Like.product_id == obj_in.product_id)
            target_model = Product
            target_id = obj_in.product_id
        elif obj_in.comment_id:
            query = query.where(Like.comment_id == obj_in.comment_id)
            target_model = Comment
            target_id = obj_in.comment_id
        else:
            return {"liked": False, "likes_count": 0, "delta": 0}

        result = await db.execute(query)
        existing_like = result.scalars().first()
        
        if existing_like:
            # Remove like
            await db.delete(existing_like)
            # Decrement counter
            await db.execute(update(target_model).where(target_model.id == target_id).values(likes_count=target_model.likes_count - 1))
            liked = False
            delta = -1
        else:
            # Add like
            new_like = Like(
                user_id=user_id,
                fingerprint=fingerprint,
                article_id=obj_in.article_id,
                product_id=obj_in.product_id,
                comment_id=obj_in.comment_id
            )
            db.add(new_like)
            # Increment counter
            await db.execute(update(target_model).where(target_model.id == target_id).values(likes_count=target_model.likes_count + 1))
            liked = True
            delta = 1
            
        await db.commit()
        
        # Fetch updated count
        count_result = await db.execute(select(target_model.likes_count).where(target_model.id == target_id))
        new_count = count_result.scalar_one()
        
        return {"liked": liked, "likes_count": new_count, "delta": delta}

    async def is_liked(self, db: AsyncSession, *, user_id: Optional[int] = None, fingerprint: Optional[str] = None, article_id: Optional[int] = None, product_id: Optional[int] = None) -> bool:
        query = select(Like)
        if user_id:
            query = query.where(Like.user_id == user_id)
        elif fingerprint:
            query = query.where(Like.fingerprint == fingerprint)
        else:
            return False
            
        if article_id:
            query = query.where(Like.article_id == article_id)
        elif product_id:
            query = query.where(Like.product_id == product_id)
            
        result = await db.execute(query)
        return result.scalars().first() is not None

    async def create_report(self, db: AsyncSession, *, obj_in: ReportCreate, user_id: int, comment_id: int):
        db_obj = Report(
            user_id=user_id,
            comment_id=comment_id,
            reason=obj_in.reason
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_comment(self, db: AsyncSession, *, comment_id: int) -> Optional[Comment]:
        result = await db.execute(select(Comment).where(Comment.id == comment_id))
        return result.scalars().first()

    async def delete_comment(self, db: AsyncSession, *, comment: Comment):
        # Decrement counter
        if comment.article_id:
            await db.execute(update(Article).where(Article.id == comment.article_id).values(comments_count=Article.comments_count - 1))
        elif comment.product_id:
            await db.execute(update(Product).where(Product.id == comment.product_id).values(comments_count=Product.comments_count - 1))
        
        await db.delete(comment)
        await db.commit()

interactions = CRUDInteractions()
