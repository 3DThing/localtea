from typing import Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

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
    
    # Optional: Include basic user info if needed, or fetch separately
    # For now, just user_id is enough as per basic spec, 
    # but usually frontend needs username/avatar.
    # Let's assume we might expand this later or use a nested User schema if requested.
    
    model_config = ConfigDict(from_attributes=True)

# --- Like Schemas ---
class LikeCreate(BaseModel):
    article_id: Optional[int] = None
    product_id: Optional[int] = None
    comment_id: Optional[int] = None

class LikeResponse(BaseModel):
    liked: bool
    likes_count: int

# --- View Schemas ---
class ViewCreate(BaseModel):
    article_id: Optional[int] = None
    product_id: Optional[int] = None

# --- Report Schemas ---
class ReportCreate(BaseModel):
    reason: str
