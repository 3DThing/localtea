import asyncio
import sys
import os
from datetime import datetime, timezone

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.session import AsyncSessionLocal
from backend.core.security import get_password_hash
from sqlalchemy import text

async def create_superuser():
    email = input("Enter superuser email: ")
    username = input("Enter superuser username: ")
    password = input("Enter superuser password: ")
    
    hashed_password = get_password_hash(password)
    
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(text("SELECT id FROM public.user WHERE email = :email"), {"email": email})
        user = result.scalar()
        
        if user:
            print(f"User with email {email} already exists. Updating password...")
            await session.execute(
                text("UPDATE public.user SET hashed_password = :hashed_password, is_superuser = true, is_active = true WHERE email = :email"),
                {"hashed_password": hashed_password, "email": email}
            )
            await session.commit()
            print(f"Password for {email} updated successfully.")
            return

        # Insert new superuser
        await session.execute(
            text("""
                INSERT INTO public.user (email, username, hashed_password, is_active, is_superuser, created_at)
                VALUES (:email, :username, :hashed_password, :is_active, :is_superuser, :created_at)
            """),
            {
                "email": email,
                "username": username,
                "hashed_password": hashed_password,
                "is_active": True,
                "is_superuser": True,
                "created_at": datetime.now(timezone.utc)
            }
        )
        await session.commit()
        print(f"Superuser {email} created successfully.")

if __name__ == "__main__":
    asyncio.run(create_superuser())
