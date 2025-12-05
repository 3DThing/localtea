import pytest
from httpx import AsyncClient
from backend.models.user import User
from admin_backend.core.security import create_pre_auth_token, encrypt_totp_secret, decrypt_totp_secret
from admin_backend.crud import crud_admin_2fa
import pyotp

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, superuser: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": superuser.email, "password": "password"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "2fa_required"
    assert "temp_token" in data

@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, superuser: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": superuser.email, "password": "wrongpassword"}
    )
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_2fa_verify_success(client: AsyncClient, superuser: User, db_session):
    # Get the secret
    admin_2fa = await crud_admin_2fa.get_by_user_id(db_session, superuser.id)
    secret = decrypt_totp_secret(admin_2fa.secret)
    totp = pyotp.TOTP(secret)
    code = totp.now()
    
    # Create temp token
    temp_token = create_pre_auth_token(superuser.id)
    
    response = await client.post(
        "/api/v1/auth/2fa/verify",
        json={"temp_token": temp_token, "code": code}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

@pytest.mark.asyncio
async def test_2fa_verify_invalid_code(client: AsyncClient, superuser: User):
    temp_token = create_pre_auth_token(superuser.id)
    
    response = await client.post(
        "/api/v1/auth/2fa/verify",
        json={"temp_token": temp_token, "code": "000000"}
    )
    assert response.status_code == 400
