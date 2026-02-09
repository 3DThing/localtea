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
from backend.utils.client_info import get_client_ip, get_user_agent
from datetime import datetime, timedelta, timezone

import uuid

router = APIRouter()

@router.post("/registration", response_model=user_schemas.User)
@limiter.limit("5/minute")
@limiter.limit("20/hour")
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
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
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
        secure=not settings.DEBUG
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=not settings.DEBUG
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
        ip=get_client_ip(request),
        user_agent=get_user_agent(request),
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
        secure=not settings.DEBUG
    )
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=not settings.DEBUG
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/confirm-email")
async def confirm_email_redirect(
    token: str,
) -> Any:
    """
    Redirect email confirmation to frontend page
    """
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{settings.BASE_URL}/confirm-email?token={token}")

@router.post("/confirm-email")
async def confirm_email(
    token: str,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Confirm email via token (POST endpoint for frontend)
    """
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

    # Verify CSRF if enabled (refresh uses cookies => must be CSRF-protected)
    csrf_token_header = request.headers.get("X-CSRF-Token")
    csrf_token_cookie = request.cookies.get("csrf_token")
    
    refresh_token_hash = security.get_token_hash(refresh_token)
    result = await db.execute(select(Token).where(Token.refresh_token == refresh_token_hash))
    token_obj = result.scalars().first()

    if settings.CSRF_ENABLED:
        if not csrf_token_header or not csrf_token_cookie:
            raise HTTPException(status_code=403, detail="CSRF Token missing")

        if csrf_token_header != csrf_token_cookie:
            raise HTTPException(status_code=403, detail="CSRF Token mismatch")

        if not security.verify_csrf_token(csrf_token_header):
            raise HTTPException(status_code=403, detail="Invalid CSRF Token")

        # Bind CSRF token to the stored session record (prevents token reuse across sessions)
        if not token_obj or token_obj.csrf_token != csrf_token_header:
            raise HTTPException(status_code=403, detail="Invalid CSRF session")
    
    # Ensure expires_at is timezone-aware before comparison
    if token_obj:
        expires_at = token_obj.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not token_obj or token_obj.revoked or expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    # Fingerprint check
    current_ip = get_client_ip(request)
    current_ua = get_user_agent(request)
    
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
        secure=not settings.DEBUG
    )
    response.set_cookie(
        key="csrf_token",
        value=new_csrf_token,
        httponly=False,
        samesite="lax",
        secure=not settings.DEBUG
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

@router.post("/change-postal-code")
async def change_postal_code(
    postal_code_in: user_schemas.ChangePostalCode,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_postal_code(db, current_user, postal_code_in)

@router.post("/change-phone-number")
async def change_phone_number(
    phone_number_in: user_schemas.ChangePhoneNumber,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    return await user_service.update_phone_number(db, current_user, phone_number_in)

@router.post("/upload-avatar")
async def upload_avatar(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Upload avatar request: filename={file.filename}, content_type={file.content_type}, size={file.size}")
    try:
        result = await user_service.upload_avatar(db, current_user, file)
        logger.info(f"Avatar uploaded successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Avatar upload failed: {str(e)}", exc_info=True)
        raise

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


# Phone verification endpoints
@router.post("/phone-verification/start", response_model=user_schemas.PhoneVerificationStart)
@limiter.limit("3/minute")
@limiter.limit("10/hour")
async def start_phone_verification(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    """
    Начать процесс верификации телефона.
    Инициирует звонок на номер пользователя.
    """
    from backend.services.phone_verification import phone_verification_service, PhoneVerificationError
    from backend.worker import check_phone_verification_status
    
    try:
        result = await phone_verification_service.start_verification(db, current_user.id)
        
        # Запускаем фоновую задачу для проверки статуса
        check_phone_verification_status.delay(current_user.id)
        
        return result
    except PhoneVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/phone-verification/status", response_model=user_schemas.PhoneVerificationStatus)
async def check_phone_verification(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    """
    Проверить статус верификации телефона.
    """
    from backend.services.phone_verification import phone_verification_service, PhoneVerificationError
    
    try:
        return await phone_verification_service.verify_call(db, current_user.id)
    except PhoneVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/account", status_code=200)
async def delete_account(
    request: Request,
    data: user_schemas.DeleteAccount,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user_with_csrf)
) -> Any:
    """
    Удалить аккаунт пользователя (требуется подтверждение паролем)
    """
    return await user_service.delete_account(db, current_user, data.password)
