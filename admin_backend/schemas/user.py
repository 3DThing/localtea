from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime, date

class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    middlename: Optional[str] = None
    birthdate: Optional[date] = None
    address: Optional[str] = None
    password: Optional[str] = None
    is_email_confirmed: Optional[bool] = None

class UserAdminResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    is_superuser: bool
    is_email_confirmed: bool
    email_confirm_token: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    middlename: Optional[str] = None
    birthdate: Optional[date] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    items: List[UserAdminResponse]
    total: int

