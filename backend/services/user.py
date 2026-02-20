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
import io

class UserService:
    async def register_user(self, db: AsyncSession, user_in: user_schemas.UserCreate):
        user = await crud_user.user.get_by_email(db, email=user_in.email)
        if user:
            raise HTTPException(
                status_code=400,
                detail="Эту почту уже использует другой пользователь.",
            )
        user = await crud_user.user.get_by_username(db, username=user_in.username)
        if user:
            raise HTTPException(
                status_code=400,
                detail="Это имя пользователя уже используется другим пользователем.",
            )
        
        # Проверяем уникальность номера телефона
        if user_in.phone_number:
            existing_user = await crud_user.user.get_by_phone_number(db, phone_number=user_in.phone_number)
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Этот номер телефона уже зарегистрирован.",
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
            raise HTTPException(status_code=401, detail="Неверная почта или пароль")
        
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Аккаунт отключён")
            
        if not user.is_email_confirmed:
            raise HTTPException(status_code=403, detail="Почта не подтверждена")
        return user

    async def confirm_email(self, db: AsyncSession, token: str):
        user = await crud_user.user.get_by_email_confirm_token(db, token=token)
        if not user:
            raise HTTPException(status_code=404, detail="Недействительная ссылка подтверждения")
            
        if user.is_email_confirmed:
            return {"msg": "Почта уже подтверждена"}
            
        expires_at = user.email_confirm_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Срок действия ссылки истёк")
            
        user.is_email_confirmed = True
        user.email_confirm_token = None
        user.email_confirm_expires_at = None
        user.email_confirmed_at = datetime.now(timezone.utc)
        
        await db.commit()
        return {"msg": "Почта успешно подтверждена"}

    async def change_password(self, db: AsyncSession, user: User, password_in: user_schemas.ChangePassword):
        if not security.verify_password(password_in.old_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Неверный текущий пароль")
            
        if password_in.new_password == password_in.old_password:
            raise HTTPException(status_code=400, detail="Новый пароль не должен совпадать со старым")
            
        user.hashed_password = security.get_password_hash(password_in.new_password)
        db.add(user)
        await db.commit()
        
        # Отправляем уведомление о смене пароля
        send_email.delay(
            email_to=user.email,
            subject=f"{settings.PROJECT_NAME} — Пароль изменён",
            template_name="password_changed.html",
            environment={
                "username": user.username or user.firstname or "Путник",
                "changed_at": datetime.now().strftime("%d.%m.%Y в %H:%M")
            }
        )
        
        return {"msg": "Пароль успешно изменён"}

    async def change_username(self, db: AsyncSession, user: User, username_in: user_schemas.ChangeUsername):
        existing_user = await crud_user.user.get_by_username(db, username=username_in.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Это имя пользователя уже занято")
            
        user.username = username_in.username
        db.add(user)
        await db.commit()
        return {"msg": "Имя пользователя обновлено"}

    async def request_email_change(self, db: AsyncSession, user: User, email_in: user_schemas.ChangeEmail):
        if email_in.email == user.email:
            raise HTTPException(status_code=400, detail="Новый email совпадает с текущим")
            
        existing_user = await crud_user.user.get_by_email(db, email=email_in.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Эту почту уже использует другой пользователь")
            
        user.new_email_pending = email_in.email
        user.email_confirm_token = str(uuid.uuid4())
        user.email_confirm_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        db.add(user)
        await db.commit()
        
        send_email.delay(
            email_to=email_in.email,
            subject=f"{settings.PROJECT_NAME} — Подтверждение нового адреса",
            template_name="email_change.html",
            environment={
                "username": user.username or user.firstname or "Путник",
                "new_email": email_in.email,
                "token": user.email_confirm_token,
                "link": f"{settings.BASE_URL}/confirm-email-change?token={user.email_confirm_token}"
            }
        )
        return {"msg": "Письмо для подтверждения отправлено"}

    async def confirm_email_change(self, db: AsyncSession, token: str):
        user = await crud_user.user.get_by_email_confirm_token(db, token=token)
        
        if not user or not user.new_email_pending:
            raise HTTPException(status_code=404, detail="Недействительная ссылка подтверждения")
            
        expires_at = user.email_confirm_expires_at
        if expires_at is None:
            raise HTTPException(status_code=400, detail="Срок действия ссылки истёк")
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Срок действия ссылки истёк")
            
        user.email = user.new_email_pending
        user.new_email_pending = None
        user.email_confirm_token = None
        user.email_confirm_expires_at = None
        user.is_email_confirmed = True
        
        db.add(user)
        await db.commit()
        return {"msg": "Email успешно изменён"}

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

    async def update_postal_code(self, db: AsyncSession, user: User, postal_code_in: user_schemas.ChangePostalCode):
        user.postal_code = postal_code_in.postal_code
        db.add(user)
        await db.commit()
        return {"msg": "Postal code updated"}

    async def update_phone_number(self, db: AsyncSession, user: User, phone_number_in: user_schemas.ChangePhoneNumber):
        # Проверяем, изменился ли номер
        if user.phone_number == phone_number_in.phone_number:
            raise HTTPException(status_code=400, detail="Новый номер совпадает с текущим")
        
        # Проверяем уникальность номера
        if phone_number_in.phone_number:
            existing_user = await crud_user.user.get_by_phone_number(db, phone_number=phone_number_in.phone_number)
            if existing_user and existing_user.id != user.id:
                raise HTTPException(status_code=400, detail="Этот номер телефона уже зарегистрирован")
        
        user.phone_number = phone_number_in.phone_number
        
        # Сбрасываем подтверждение телефона при изменении номера
        user.is_phone_confirmed = False
        user.phone_verification_check_id = None
        user.phone_verification_expires_at = None
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return {"msg": "Номер телефона обновлён. Подтвердите новый номер телефона."}

    async def upload_avatar(self, db: AsyncSession, user: User, file: UploadFile):
        from PIL import Image
        import uuid
        
        # Проверяем расширение файла
        if file.filename:
            ext_orig = file.filename.split('.')[-1].lower()
            if ext_orig not in ['jpg', 'jpeg', 'png', 'webp']:
                raise HTTPException(status_code=422, detail="Unsupported file type. Use JPG, PNG or WEBP")
        else:
            raise HTTPException(status_code=422, detail="Invalid filename")
        
        # Проверяем размер файла (максимум 5 МБ)
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 МБ
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB")
        
        # Создаем папку для пользователя
        upload_dir = f"/app/uploads/user/{user.id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Генерируем уникальное имя файла
        ext = "webp"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = f"{upload_dir}/{filename}"
        
        try:
            # Открываем изображение из буфера (файл уже прочитан)
            img = Image.open(io.BytesIO(file_content))
            
            # Конвертируем в RGB если необходимо
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Изменяем размер если слишком большое (макс 1024px)
            max_size = 1024
            if img.width > max_size or img.height > max_size:
                if img.width > img.height:
                    ratio = max_size / img.width
                    new_height = int(img.height * ratio)
                    img = img.resize((max_size, new_height), Image.Resampling.LANCZOS)
                else:
                    ratio = max_size / img.height
                    new_width = int(img.width * ratio)
                    img = img.resize((new_width, max_size), Image.Resampling.LANCZOS)
            
            # Сохраняем как WebP
            img.save(filepath, "WEBP", quality=85)
            
            # Формируем URL для доступа
            base_url = settings.UPLOADS_BASE_URL or settings.API_BASE_URL
            avatar_url = f"{base_url}/uploads/user/{user.id}/{filename}"
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
            
        user.avatar_url = avatar_url
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return {"msg": "Avatar uploaded", "avatar_url": avatar_url}

    async def delete_account(self, db: AsyncSession, user: User, password: str):
        """Delete user account after password confirmation"""
        from sqlalchemy import select, delete
        from backend.models.cart import Cart, CartItem
        from backend.models.order import Order
        from backend.models.interactions import Comment, Like, View
        from backend.models.blog import Article
        from backend.models.token import Token
        from backend.models.admin import Admin2FA
        
        # Verify password
        if not security.verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=400,
                detail="Неверный пароль"
            )
        
        # Delete related records in correct order
        # 1. Delete cart items
        cart_result = await db.execute(select(Cart).where(Cart.user_id == user.id))
        cart = cart_result.scalars().first()
        if cart:
            await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
            await db.delete(cart)
        
        # 2. Set orders user_id to NULL (keep order history)
        orders = (await db.execute(select(Order).where(Order.user_id == user.id))).scalars().all()
        for order in orders:
            order.user_id = None
        
        # 3. Delete interactions
        await db.execute(delete(Like).where(Like.user_id == user.id))
        await db.execute(delete(Comment).where(Comment.user_id == user.id))
        await db.execute(delete(View).where(View.user_id == user.id))
        
        # 4. Delete articles (if author)
        await db.execute(delete(Article).where(Article.author_id == user.id))
        
        # 5. Delete admin 2FA
        await db.execute(delete(Admin2FA).where(Admin2FA.user_id == user.id))
        
        # 6. Delete tokens (will be handled by cascade, but explicit is better)
        await db.execute(delete(Token).where(Token.user_id == user.id))
        
        # 7. Finally delete user
        await db.delete(user)
        await db.commit()
        
        return {"msg": "Account deleted successfully"}

user_service = UserService()
