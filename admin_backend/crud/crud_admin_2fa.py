from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.models.admin import Admin2FA

async def get_by_user_id(db: AsyncSession, user_id: int) -> Optional[Admin2FA]:
    result = await db.execute(select(Admin2FA).where(Admin2FA.user_id == user_id))
    return result.scalars().first()

async def create(db: AsyncSession, user_id: int, secret: str) -> Admin2FA:
    db_obj = Admin2FA(user_id=user_id, secret=secret, is_enabled=False)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_secret(db: AsyncSession, db_obj: Admin2FA, secret: str) -> Admin2FA:
    db_obj.secret = secret
    db_obj.is_enabled = False # Reset enabled status on new secret
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def enable_2fa(db: AsyncSession, db_obj: Admin2FA) -> Admin2FA:
    db_obj.is_enabled = True
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
