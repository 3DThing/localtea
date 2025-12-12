"""
Schemas for content moderation.
"""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from enum import Enum


class ReportStatus(str, Enum):
    NEW = "new"
    RESOLVED = "resolved"
    REJECTED = "rejected"


# --- Comment Schemas ---
class CommentAuthor(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    is_banned: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class CommentModerationResponse(BaseModel):
    id: int
    content: str
    user_id: int
    user: Optional[CommentAuthor] = None
    article_id: Optional[int] = None
    product_id: Optional[int] = None
    likes_count: int = 0
    reports_count: int = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CommentListResponse(BaseModel):
    items: List[CommentModerationResponse]
    total: int


# --- Report Schemas ---
class ReportResponse(BaseModel):
    id: int
    user_id: int
    comment_id: int
    reason: str
    status: ReportStatus
    created_at: datetime
    comment: Optional[CommentModerationResponse] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int


class ReportResolve(BaseModel):
    action: str = Field(..., pattern="^(resolve|reject|delete_comment)$")
    reason: Optional[str] = None


# --- User Ban Schemas ---
class UserBanRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)
    ban_until: Optional[datetime] = None  # None = permanent


class UserBanResponse(BaseModel):
    id: int
    email: str
    username: str
    is_banned: bool
    ban_reason: Optional[str] = None
    banned_at: Optional[datetime] = None
    ban_until: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
