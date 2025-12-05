from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core import security
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User
from backend.schemas.token import TokenPayload
from sqlalchemy import select

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/v1/user/login/access-token")

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(**payload)
    except (JWTError, ValueError):
        raise credentials_exception
    
    # Check if token is access token
    if payload.get("type") != "access":
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_with_csrf(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> User:
    if not settings.CSRF_ENABLED:
        return current_user

    csrf_token = request.headers.get("X-CSRF-Token")
    if not csrf_token:
         raise HTTPException(status_code=403, detail="CSRF Token missing")
    
    if not security.verify_csrf_token(csrf_token):
            raise HTTPException(status_code=403, detail="Invalid CSRF Token")
        
    return current_user

import uuid
from fastapi import Header

async def get_user_or_session(
    request: Request,
    x_session_id: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> tuple[Optional[int], str]:
    """
    Helper to determine user_id and session_id.
    If user is authenticated, returns (user_id, None).
    If anonymous, returns (None, session_id).
    If no session_id, generates one.
    """
    # Check authorization
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header:
        try:
            scheme, token = auth_header.split()
            if scheme.lower() == "bearer":
                # We manually verify here to not raise 401 if invalid, just treat as anonymous
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                user_id_str: str = payload.get("sub")
                if user_id_str:
                    user_id = int(user_id_str)
        except Exception:
            pass # Invalid token, treat as anonymous

    if user_id:
        return user_id, None

    # Anonymous
    if not x_session_id:
        x_session_id = str(uuid.uuid4())
    
    return None, x_session_id

