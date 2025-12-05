from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    state: str # "2fa_required", "2fa_setup_required"
    temp_token: str

class TwoFASetupResponse(BaseModel):
    secret: str
    otpauth_url: str

class TwoFAVerifyRequest(BaseModel):
    temp_token: str
    code: str

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str
