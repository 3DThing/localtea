from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, UploadFile
from backend.crud import crud_user
from backend.schemas import user as user_schemas
from backend.worker import send_email
from backend.core import security
from backend.core.config import settings
from backend.models.user import User
from datetime import datetime, timedelta, timezone
import uuid
import shutil
import os

class UserService:
    async def register_user(self, db: AsyncSession, user_in: user_schemas.UserCreate):
        user = await crud_user.user.get_by_email(db, email=user_in.email)
        if user:
            raise HTTPException(
                status_code=400,
                detail="The user with this email already exists in the system.",
            )
        user = await crud_user.user.get_by_username(db, username=user_in.username)
        if user:
            raise HTTPException(
                status_code=400,
                detail="The user with this username already exists in the system.",
            )
        
        user = await crud_user.user.create(db, obj_in=user_in)
        
        # Token generation logic
        user.email_confirm_token = str(uuid.uuid4())
        user.email_confirm_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        send_email.delay(
            email_to=user.email,
            subject="Подтверждение почты",
            template_name="verification.html",
            environment={
                "title": "Добро пожаловать в LocalTea!",
                "token": user.email_confirm_token,
                "link": f"{settings.API_BASE_URL}/api/v1/user/confirm-email?token={user.email_confirm_token}"
            }
        )
        return user

    async def authenticate_user(self, db: AsyncSession, user_in: user_schemas.UserLogin) -> User:
        user = await crud_user.user.authenticate(db, email=user_in.email, password=user_in.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
            
        if not user.is_email_confirmed:
            raise HTTPException(status_code=403, detail="Email not confirmed")
        return user

    async def confirm_email(self, db: AsyncSession, token: str):
        user = await crud_user.user.get_by_email_confirm_token(db, token=token)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.is_email_confirmed:
            return {"msg": "Email already confirmed"}
            
        expires_at = user.email_confirm_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Token expired")
            
        user.is_email_confirmed = True
        user.email_confirm_token = None
        user.email_confirm_expires_at = None
        user.email_confirmed_at = datetime.now(timezone.utc)
        
        await db.commit()
        return {"msg": "Email confirmed successfully"}

    async def change_password(self, db: AsyncSession, user: User, password_in: user_schemas.ChangePassword):
        if not security.verify_password(password_in.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect old password")
            
        if password_in.new_password == password_in.old_password:
            raise HTTPException(status_code=400, detail="New password cannot be the same as old password")
            
        user.hashed_password = security.get_password_hash(password_in.new_password)
        db.add(user)
        await db.commit()
        return {"msg": "Password updated successfully"}

    async def change_username(self, db: AsyncSession, user: User, username_in: user_schemas.ChangeUsername):
        existing_user = await crud_user.user.get_by_username(db, username=username_in.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
            
        user.username = username_in.username
        db.add(user)
        await db.commit()
        return {"msg": "Username updated successfully"}

    async def request_email_change(self, db: AsyncSession, user: User, email_in: user_schemas.ChangeEmail):
        if email_in.email == user.email:
            raise HTTPException(status_code=400, detail="New email same as current")
            
        existing_user = await crud_user.user.get_by_email(db, email=email_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        user.new_email_pending = email_in.email
        user.email_confirm_token = str(uuid.uuid4())
        user.email_confirm_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        db.add(user)
        await db.commit()
        
        send_email.delay(
            email_to=email_in.email,
            subject="Подтверждение новой почты",
            template_name="verification.html",
            environment={
                "title": "Запрос на смену почты",
                "token": user.email_confirm_token,
                "link": f"https://localtea.ru/confirm-email-change?token={user.email_confirm_token}"
            }
        )
        return {"msg": "Confirmation email sent"}

    async def confirm_email_change(self, db: AsyncSession, token: str):
        user = await crud_user.user.get_by_email_confirm_token(db, token=token)
        
        if not user or not user.new_email_pending:
            raise HTTPException(status_code=404, detail="Invalid token")
            
        if user.email_confirm_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Token expired")
            
        user.email = user.new_email_pending
        user.new_email_pending = None
        user.email_confirm_token = None
        user.email_confirm_expires_at = None
        user.is_email_confirmed = True
        
        db.add(user)
        await db.commit()
        return {"msg": "Email changed successfully"}

    async def update_lastname(self, db: AsyncSession, user: User, lastname_in: user_schemas.ChangeLastname):
        user.lastname = lastname_in.lastname
        db.add(user)
        await db.commit()
        return {"msg": "Lastname updated"}

    async def update_firstname(self, db: AsyncSession, user: User, firstname_in: user_schemas.ChangeFirstname):
        user.firstname = firstname_in.firstname
        db.add(user)
        await db.commit()
        return {"msg": "Firstname updated"}

    async def update_middlename(self, db: AsyncSession, user: User, middlename_in: user_schemas.ChangeMiddlename):
        user.middlename = middlename_in.middlename
        db.add(user)
        await db.commit()
        return {"msg": "Middlename updated"}

    async def update_birthdate(self, db: AsyncSession, user: User, birthdate_in: user_schemas.ChangeBirthdate):
        user.birthdate = birthdate_in.birthdate
        db.add(user)
        await db.commit()
        return {"msg": "Birthdate updated"}

    async def update_address(self, db: AsyncSession, user: User, address_in: user_schemas.ChangeAddress):
        user.address = address_in.address
        db.add(user)
        await db.commit()
        return {"msg": "Address updated"}

    async def upload_avatar(self, db: AsyncSession, user: User, file: UploadFile):
        if file.content_type not in ["image/jpeg", "image/png"]:
            raise HTTPException(status_code=422, detail="Invalid file type")
            
        upload_dir = "backend/uploads/avatars"
        os.makedirs(upload_dir, exist_ok=True)
        
        file_location = f"{upload_dir}/{user.id}_{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        user.avatar_url = file_location
        db.add(user)
        await db.commit()
        return {"msg": "Avatar uploaded"}

user_service = UserService()
