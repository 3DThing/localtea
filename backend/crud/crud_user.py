from typing import Optional, Dict, Any, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.crud.base import CRUDBase
from backend.models.user import User
from backend.schemas.user import UserCreate, UserUpdate
from backend.core.security import get_password_hash, verify_password

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()
    
    async def get_by_username(self, db: AsyncSession, *, username: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            username=obj_in.username,
            firstname=obj_in.firstname,
            lastname=obj_in.lastname,
            middlename=obj_in.middlename,
            birthdate=obj_in.birthdate,
            address=obj_in.address,
            is_email_confirmed=False
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def authenticate(self, db: AsyncSession, *, email: str, password: str) -> Optional[User]:
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    async def get_by_email_confirm_token(self, db: AsyncSession, *, token: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email_confirm_token == token))
        return result.scalars().first()

user = CRUDUser(User)
