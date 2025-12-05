import asyncio
from backend.db.session import AsyncSessionLocal
from backend.models.user import User
from backend.models.token import Token
from sqlalchemy import select

async def delete_user(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if user:
            await session.delete(user)
            await session.commit()
            print(f"User {email} deleted.")
        else:
            print(f"User {email} not found.")

if __name__ == "__main__":
    asyncio.run(delete_user("rbiter@yandex.ru"))
