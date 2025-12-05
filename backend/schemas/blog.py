from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ArticleBase(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    preview_image: Optional[str] = None
    is_published: Optional[bool] = False

class Article(ArticleBase):
    id: int
    title: str
    slug: str
    content: str
    created_at: datetime
    author_id: Optional[int] = None
    
    views_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    is_liked: bool = False

    model_config = ConfigDict(from_attributes=True)
