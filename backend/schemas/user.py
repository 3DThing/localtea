from typing import Optional
from pydantic import BaseModel, EmailStr, constr, field_validator, ConfigDict
from datetime import date, datetime

# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    middlename: Optional[str] = None
    birthdate: Optional[date] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None

# Properties to receive via API on creation
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    middlename: Optional[str] = None
    birthdate: Optional[date] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator('password')
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Add more complexity checks if needed
        return v

# Properties to receive via API on update
class UserUpdate(BaseModel):
    password: Optional[str] = None
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    middlename: Optional[str] = None
    birthdate: Optional[date] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    phone_number: Optional[str] = None
    avatar_url: Optional[str] = None

class UserInDBBase(UserBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_email_confirmed: bool = False
    is_phone_confirmed: bool = False

    model_config = ConfigDict(from_attributes=True)

# Additional properties to return via API
class User(UserInDBBase):
    pass

# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class ChangeEmail(BaseModel):
    email: EmailStr

class ChangeUsername(BaseModel):
    username: str

class ChangeLastname(BaseModel):
    lastname: str

class ChangeFirstname(BaseModel):
    firstname: str

class ChangeMiddlename(BaseModel):
    middlename: str

class ChangeBirthdate(BaseModel):
    birthdate: date

class ChangeAddress(BaseModel):
    address: str

class ChangePostalCode(BaseModel):
    postal_code: str

class ChangePhoneNumber(BaseModel):
    phone_number: str

class DeleteAccount(BaseModel):
    password: str


# Phone verification schemas
class PhoneVerificationStart(BaseModel):
    """Ответ на начало верификации телефона."""
    call_phone: str
    call_phone_pretty: str
    expires_at: str
    timeout_seconds: int


class PhoneVerificationStatus(BaseModel):
    """Статус верификации телефона."""
    is_confirmed: bool
    is_pending: Optional[bool] = None
    is_expired: Optional[bool] = None
    message: str
