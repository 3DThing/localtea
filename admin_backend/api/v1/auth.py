from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from backend.db.session import get_db
from backend.crud.crud_user import user as crud_user
from admin_backend.crud import crud_admin_2fa
from admin_backend.schemas.auth import LoginRequest, LoginResponse, TwoFASetupResponse, TwoFAVerifyRequest, Token
from admin_backend.core.security import create_pre_auth_token, encrypt_totp_secret, decrypt_totp_secret, create_refresh_token_str
from backend.core.security import create_access_token, create_csrf_token, get_token_hash
from backend.core.config import settings
from backend.models.token import Token as DBToken
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import pyotp


router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await crud_user.authenticate(db, email=login_data.email, password=login_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough privileges")

    # Check 2FA status
    admin_2fa = await crud_admin_2fa.get_by_user_id(db, user.id)
    
    temp_token = create_pre_auth_token(user.id)
    
    if not admin_2fa or not admin_2fa.is_enabled:
        return LoginResponse(state="2fa_setup_required", temp_token=temp_token)
    else:
        return LoginResponse(state="2fa_required", temp_token=temp_token)

@router.post("/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(temp_token: str, db: AsyncSession = Depends(get_db)):
    # Verify temp_token
    try:
        payload = jwt.decode(temp_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        token_type = payload.get("type")
        if token_type != "pre_auth":
             raise HTTPException(status_code=401, detail="Invalid token type")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate new secret
    secret = pyotp.random_base32()
    encrypted_secret = encrypt_totp_secret(secret)
    
    admin_2fa = await crud_admin_2fa.get_by_user_id(db, user_id)
    if admin_2fa:
        await crud_admin_2fa.update_secret(db, admin_2fa, encrypted_secret)
    else:
        await crud_admin_2fa.create(db, user_id, encrypted_secret)
    
    otpauth_url = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="LocalTea Admin")
    
    return TwoFASetupResponse(secret=secret, otpauth_url=otpauth_url)

@router.post("/2fa/verify", response_model=Token)
async def verify_2fa(request: Request, verify_data: TwoFAVerifyRequest, db: AsyncSession = Depends(get_db)):
    # Verify temp_token
    try:
        payload = jwt.decode(verify_data.temp_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        token_type = payload.get("type")
        if token_type != "pre_auth":
             raise HTTPException(status_code=401, detail="Invalid token type")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    admin_2fa = await crud_admin_2fa.get_by_user_id(db, user_id)
    if not admin_2fa:
        raise HTTPException(status_code=400, detail="2FA not set up")
    
    secret = decrypt_totp_secret(admin_2fa.secret)
    totp = pyotp.TOTP(secret)
    
    if not totp.verify(verify_data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Enable 2FA if not enabled
    if not admin_2fa.is_enabled:
        await crud_admin_2fa.enable_2fa(db, admin_2fa)
        
    # Generate access tokens
    access_token = create_access_token(user_id)
    refresh_token_str = create_refresh_token_str()
    refresh_token_hash = get_token_hash(refresh_token_str)
    csrf_token = create_csrf_token()
    
    # Save refresh token hash to DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = DBToken(
        user_id=user_id,
        refresh_token=refresh_token_hash,
        csrf_token=csrf_token,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        user_agent=request.headers.get("User-Agent", "Admin Panel"),
        ip=request.client.host if request.client else "0.0.0.0"
    )
    db.add(db_token)
    await db.commit()
    
    return Token(access_token=access_token, token_type="bearer", refresh_token=refresh_token_str)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request, refresh_data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    from sqlalchemy import select
    
    # Hash the incoming token to compare with stored hash
    refresh_token_hash = get_token_hash(refresh_data.refresh_token)
    
    # Find the refresh token in DB
    result = await db.execute(
        select(DBToken).where(
            DBToken.refresh_token == refresh_token_hash,
            DBToken.revoked == False,
            DBToken.expires_at > datetime.now(timezone.utc)
        )
    )
    db_token = result.scalar_one_or_none()
    
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    # Get user
    user = await crud_user.get(db, id=db_token.user_id)
    if not user or not user.is_superuser:
        raise HTTPException(status_code=401, detail="User not found or not admin")
    
    # Revoke old token
    db_token.revoked = True
    db_token.rotated_at = datetime.now(timezone.utc)
    
    # Generate new tokens
    access_token = create_access_token(user.id)
    new_refresh_token_str = create_refresh_token_str()
    new_refresh_token_hash = get_token_hash(new_refresh_token_str)
    csrf_token = create_csrf_token()
    
    # Save new refresh token hash
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_db_token = DBToken(
        user_id=user.id,
        refresh_token=new_refresh_token_hash,
        csrf_token=csrf_token,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        user_agent=request.headers.get("User-Agent", "Admin Panel"),
        ip=request.client.host if request.client else "0.0.0.0"
    )
    db.add(new_db_token)
    await db.commit()
    
    return Token(access_token=access_token, token_type="bearer", refresh_token=new_refresh_token_str)

