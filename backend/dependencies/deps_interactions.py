from typing import Optional
from fastapi import Request, Depends
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hashlib

from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User

async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    token = request.headers.get("Authorization")
    if not token:
        return None
    try:
        scheme, param = token.split()
        if scheme.lower() != "bearer":
            return None
        token = param
    except ValueError:
        return None
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except (JWTError, ValidationError):
        return None
        
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalars().first()
    return user

def get_fingerprint(request: Request) -> str:
    ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    # Use a salt if possible, but for now just hash
    raw = f"{ip}|{user_agent}"
    return hashlib.sha256(raw.encode()).hexdigest()
