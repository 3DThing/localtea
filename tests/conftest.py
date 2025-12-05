import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from backend.main import app
from backend.db.base import Base
from backend.dependencies.deps import get_db
from backend.core.limiter import limiter
import asyncio
import os

@pytest.fixture(scope="function")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Disable rate limiter for tests
limiter.enabled = False

# Postgres connection settings
from sqlalchemy.engine import make_url

# Для создания тестовой БД нужны права CREATEDB.
# Берем их из явных переменных POSTGRES_*, которые мы прокинули в docker-compose
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_HOST = os.getenv("POSTGRES_HOST", "db")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

TEST_DB_NAME = "localtea_test"

# Connection URL for administrative tasks (creating the test DB)
ADMIN_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"
# Connection URL for the test DB
TEST_DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{TEST_DB_NAME}"

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create the test database if it doesn't exist."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def _setup():
        # Connect to default 'postgres' database to create the test db
        admin_engine = create_async_engine(ADMIN_DATABASE_URL, isolation_level="AUTOCOMMIT")
        try:
            async with admin_engine.connect() as conn:
                # Check if test database exists
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
async def db_engine(event_loop):
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """
    Creates a fresh database session for a test.
    Creates tables before the test and drops them after.
    """
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session
    
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

# --- Shared User Fixtures ---
from unittest.mock import patch
from backend.models.user import User
from sqlalchemy import select

@pytest.fixture
def user_data():
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "StrongPassword123!",
        "firstname": "Test",
        "lastname": "User",
        "birthdate": "2000-01-01"
    }

@pytest_asyncio.fixture
async def registered_user(client: AsyncClient, user_data):
    with patch("backend.worker.send_email.delay"):
        response = await client.post("/api/v1/user/registration", json=user_data)
        assert response.status_code == 200
        return response.json()

@pytest_asyncio.fixture
async def confirmed_user(client: AsyncClient, db_session, registered_user, user_data):
    # Get token from DB
    result = await db_session.execute(select(User).where(User.email == user_data["email"]))
    user = result.scalars().first()
    token = user.email_confirm_token
    
    # Confirm email
    await client.get(f"/api/v1/user/confirm-email?token={token}")
    return user

@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, confirmed_user, user_data):
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    response = await client.post("/api/v1/user/login", json=login_data)
    assert response.status_code == 200
    tokens = response.json()
    access_token = tokens["access_token"]
    csrf_token = response.cookies.get("csrf_token")
    
    return {
        "Authorization": f"Bearer {access_token}",
        "X-CSRF-Token": csrf_token
    }

from unittest.mock import AsyncMock

@pytest.fixture(autouse=True)
def mock_redis(monkeypatch):
    mock_client = AsyncMock()
    mock_client.get.return_value = "0"
    mock_client.exists.return_value = 1
    mock_client.incr.return_value = 1
    mock_client.incrby.return_value = 1
    
    monkeypatch.setattr("backend.core.cache.redis_client", mock_client)
    return mock_client

