from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ArticleAuthor(BaseModel):
    """Информация об авторе статьи"""
    id: int
    username: Optional[str] = None
    email: str
    
    model_config = ConfigDict(from_attributes=True)


class ArticleBase(BaseModel):
    """Базовые поля статьи"""
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    preview_image: Optional[str] = None
    is_published: Optional[bool] = False


class ArticleCreate(BaseModel):
    """Схема для создания статьи"""
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    preview_image: Optional[str] = None
    is_published: bool = False


class ArticleUpdate(BaseModel):
    """Схема для обновления статьи"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    preview_image: Optional[str] = None
    is_published: Optional[bool] = None


class ArticleAdminResponse(BaseModel):
    """Полная информация о статье для админки"""
    id: int
    title: str
    slug: str
    content: str
    preview_image: Optional[str] = None
    is_published: bool
    created_at: datetime
    author_id: Optional[int] = None
    author: Optional[ArticleAuthor] = None
    views_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class ArticleListResponse(BaseModel):
    """Ответ со списком статей и пагинацией"""
    items: List[ArticleAdminResponse]
    total: int
