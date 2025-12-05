from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.dependencies import deps
from backend.core import security
from backend.core.config import settings
from backend.models.user import User
from backend.models.token import Token
from backend.schemas import user as user_schemas
from backend.schemas import token as token_schemas
from backend.core.limiter import limiter
from backend.services.user import user_service
from backend.crud import crud_user
from datetime import datetime, timedelta, timezone

import uuid

router = APIRouter()

@router.post("/registration", response_model=user_schemas.User)
@limiter.limit("2/minute")
@limiter.limit("10/hour")
async def registration(
    request: Request,
    user_in: user_schemas.UserCreate,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    return await user_service.register_user(db, user_in)

@router.post("/login/access-token", response_model=token_schemas.Token)
async def login_access_token(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await user_service.authenticate_user(
        db, user_schemas.UserLogin(email=form_data.username, password=form_data.password)
    )
        
    access_token = security.create_access_token(user.id)
    
    # Generate random refresh token
    refresh_token_plain = str(uuid.uuid4())
    refresh_token_hash = security.get_token_hash(refresh_token_plain)
    
    csrf_token = security.create_csrf_token()
    
    # Store session in DB (store hash)
    db_token = Token(
        user_id=user.id,
        refresh_token=refresh_token_hash,
        csrf_token=csrf_token,
        ip=request.client.host,
        user_agent=request.headers.get("User-Agent"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_token)
    await db.commit()
    
    # Set cookies (send plain token)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_plain,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False # Set to True in prod
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=False
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=token_schemas.Token)
@limiter.limit("3/minute")
@limiter.limit("20/hour")
async def login(
    request: Request,
    response: Response,
    user_in: user_schemas.UserLogin,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user = await user_service.authenticate_user(db, user_in)
        
    access_token = security.create_access_token(user.id)
    
    # Generate random refresh token
    refresh_token_plain = str(uuid.uuid4())
    refresh_token_hash = security.get_token_hash(refresh_token_plain)
    
    csrf_token = security.create_csrf_token()
    
    # Store session in DB (store hash)
    db_token = Token(
        user_id=user.id,
        refresh_token=refresh_token_hash,
        csrf_token=csrf_token,
        ip=request.client.host,
        user_agent=request.headers.get("User-Agent"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(db_token)
    await db.commit()
    
    # Set cookies (send plain token)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_plain,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False # Set to True in prod
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=False
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/confirm-email")
async def confirm_email(
    token: str,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    return await user_service.confirm_email(db, token)

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        refresh_token_hash = security.get_token_hash(refresh_token)
        result = await db.execute(select(Token).where(Token.refresh_token == refresh_token_hash))
        token_obj = result.scalars().first()
        if token_obj:
            token_obj.revoked = True
            await db.commit()
            
    response.delete_cookie("refresh_token")
    response.delete_cookie("csrf_token")
    return {"msg": "Logged out"}

@router.post("/refresh", response_model=token_schemas.Token)
@limiter.limit("2/minute")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    # Verify CSRF if needed
    csrf_token_header = request.headers.get("X-CSRF-Token")
    
    refresh_token_hash = security.get_token_hash(refresh_token)
    result = await db.execute(select(Token).where(Token.refresh_token == refresh_token_hash))
    token_obj = result.scalars().first()
    
    # Ensure expires_at is timezone-aware before comparison
    if token_obj:
        expires_at = token_obj.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not token_obj or token_obj.revoked or expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Fingerprint check
    current_ip = request.client.host
    current_ua = request.headers.get("User-Agent")
    
    if token_obj.ip != current_ip or token_obj.user_agent != current_ua:
        # Revoke token on suspicious activity
        token_obj.revoked = True
        await db.commit()
        raise HTTPException(status_code=401, detail="Session invalid (context changed)")
        
    # Rotate
    # Revoke old token
    token_obj.revoked = True
    
    # Create new token
    new_access_token = security.create_access_token(token_obj.user_id)
    new_refresh_token_plain = str(uuid.uuid4())
    new_refresh_token_hash = security.get_token_hash(new_refresh_token_plain)
    new_csrf_token = security.create_csrf_token()
    
    new_db_token = Token(
        user_id=token_obj.user_id,
        refresh_token=new_refresh_token_hash,
        csrf_token=new_csrf_token,
        ip=current_ip,
        user_agent=current_ua,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_db_token)
    await db.commit()
    
    # Re-set CSRF cookie to ensure client has it
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token_plain,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=False
    )
    response.set_cookie(
        key="csrf_token",
        value=new_csrf_token,
        httponly=False,
        samesite="lax",
        secure=False
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/change-password")
async def change_password(
    password_in: user_schemas.ChangePassword,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.change_password(db, current_user, password_in)

@router.post("/change-username")
async def change_username(
    username_in: user_schemas.ChangeUsername,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.change_username(db, current_user, username_in)

@router.post("/change-email")
async def change_email(
    email_in: user_schemas.ChangeEmail,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.request_email_change(db, current_user, email_in)

@router.get("/confirm-email-change")
async def confirm_email_change(
    token: str,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    return await user_service.confirm_email_change(db, token)

@router.post("/change-lastname")
async def change_lastname(
    lastname_in: user_schemas.ChangeLastname,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_lastname(db, current_user, lastname_in)

@router.post("/change-firstname")
async def change_firstname(
    firstname_in: user_schemas.ChangeFirstname,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_firstname(db, current_user, firstname_in)

@router.post("/change-middlename")
async def change_middlename(
    middlename_in: user_schemas.ChangeMiddlename,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_middlename(db, current_user, middlename_in)

@router.post("/change-birthdate")
async def change_birthdate(
    birthdate_in: user_schemas.ChangeBirthdate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_birthdate(db, current_user, birthdate_in)

@router.post("/change-address")
async def change_address(
    address_in: user_schemas.ChangeAddress,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_address(db, current_user, address_in)

@router.post("/upload-avatar")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.upload_avatar(db, current_user, file)

@router.get("/get-profile", response_model=user_schemas.User)
async def get_profile(
    request: Request,
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return current_user

@router.get("/get-public-profile/{user_id}")
async def get_public_profile(
    user_id: int,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    user = await crud_user.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "username": user.username,
        "avatar_url": user.avatar_url
    }
