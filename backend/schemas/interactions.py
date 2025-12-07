from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- User Info (для вложения в комментарии) ---
class UserBasic(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# --- Comment Schemas ---
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    article_id: Optional[int] = None
    product_id: Optional[int] = None

class Comment(CommentBase):
    id: int
    user_id: int
    created_at: datetime
    likes_count: int
    article_id: Optional[int] = None
    product_id: Optional[int] = None
    user: Optional[UserBasic] = None  # Добавляем информацию о пользователе
    
    model_config = ConfigDict(from_attributes=True)

# --- Like Schemas ---
class LikeCreate(BaseModel):
    article_id: Optional[int] = None
    product_id: Optional[int] = None
    comment_id: Optional[int] = None

class LikeResponse(BaseModel):
    liked: bool
    likes_count: int
    delta: int = 0

# --- View Schemas ---
class ViewCreate(BaseModel):
    article_id: Optional[int] = None
    product_id: Optional[int] = None

# --- Report Schemas ---
class ReportCreate(BaseModel):
    reason: str
