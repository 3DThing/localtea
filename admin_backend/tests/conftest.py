import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from admin_backend.main import app
from backend.db.session import get_db
from backend.db.base import Base
from backend.core.security import create_access_token, get_password_hash
from backend.models.user import User
from admin_backend.crud import crud_admin_2fa
from admin_backend.core.security import encrypt_totp_secret
import pyotp
import asyncio
import os

# Postgres connection settings
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("POSTGRES_HOST", "db")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

TEST_DB_NAME = "localtea_test_admin"

ADMIN_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"
TEST_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{TEST_DB_NAME}"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def _setup():
        admin_engine = create_async_engine(ADMIN_DATABASE_URL, isolation_level="AUTOCOMMIT")
        try:
            async with admin_engine.connect() as conn:
                result = await conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{TEST_DB_NAME}'"))
                if not result.scalar():
                    await conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))
        except Exception as e:
            print(f"Warning: Could not create test database: {e}")
        finally:
            await admin_engine.dispose()

    loop.run_until_complete(_setup())
    loop.close()
    yield

@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
    
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def superuser(db_session):
    user = User(
        email="admin@example.com",
        username="admin",
        hashed_password=get_password_hash("password"),
        is_superuser=True,
        is_active=True,
        is_email_confirmed=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    # Setup 2FA for this user
    secret = pyotp.random_base32()
    encrypted_secret = encrypt_totp_secret(secret)
    await crud_admin_2fa.create(db_session, user.id, encrypted_secret)
    
    # Enable it
    admin_2fa = await crud_admin_2fa.get_by_user_id(db_session, user.id)
    await crud_admin_2fa.enable_2fa(db_session, admin_2fa)
    
    return user

@pytest.fixture
def superuser_token_headers(superuser):
    access_token = create_access_token(superuser.id)
    return {"Authorization": f"Bearer {access_token}"}

# Alias for blog tests
@pytest.fixture
def auth_headers(superuser_token_headers):
    return superuser_token_headers

@pytest.fixture
async def normal_user(db_session):
    user = User(
        email="user@example.com",
        username="user",
        hashed_password=get_password_hash("password"),
        is_superuser=False,
        is_active=True,
        is_email_confirmed=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
def normal_user_token_headers(normal_user):
    access_token = create_access_token(normal_user.id)
    return {"Authorization": f"Bearer {access_token}"}
