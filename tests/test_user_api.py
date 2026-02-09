import pytest
from unittest.mock import patch
from backend.models.user import User
from sqlalchemy import select
from httpx import AsyncClient

# --- Registration Tests ---

@pytest.mark.asyncio
async def test_register_user_success(client, user_data):
    with patch("backend.worker.send_email.delay") as mock_email:
        response = await client.post("/api/v1/user/registration", json=user_data)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert mock_email.called

@pytest.mark.asyncio
async def test_register_user_duplicate_email(client, registered_user, user_data):
    response = await client.post("/api/v1/user/registration", json=user_data)
    assert response.status_code == 400
    assert "почту" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_register_user_duplicate_username(client, registered_user, user_data):
    user_data_2 = user_data.copy()
    user_data_2["email"] = "other@example.com"
    response = await client.post("/api/v1/user/registration", json=user_data_2)
    assert response.status_code == 400
    assert "имя пользователя" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_register_user_invalid_email(client, user_data):
    user_data["email"] = "invalid-email"
    response = await client.post("/api/v1/user/registration", json=user_data)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_register_user_short_password(client, user_data):
    user_data["password"] = "short"
    response = await client.post("/api/v1/user/registration", json=user_data)
    assert response.status_code == 422

# --- Login Tests ---

@pytest.mark.asyncio
async def test_login_success(client, confirmed_user, user_data):
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    response = await client.post("/api/v1/user/login", json=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.cookies
    assert "csrf_token" in response.cookies

@pytest.mark.asyncio
async def test_login_wrong_password(client, confirmed_user, user_data):
    login_data = {
        "email": user_data["email"],
        "password": "WrongPassword123!"
    }
    response = await client.post("/api/v1/user/login", json=login_data)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_login_non_existent_user(client):
    login_data = {
        "email": "nonexistent@example.com",
        "password": "SomePassword123!"
    }
    response = await client.post("/api/v1/user/login", json=login_data)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_login_unconfirmed_email(client, registered_user, user_data):
    login_data = {
        "email": user_data["email"],
        "password": user_data["password"]
    }
    response = await client.post("/api/v1/user/login", json=login_data)
    assert response.status_code == 403

# --- Email Confirmation Tests ---

@pytest.mark.asyncio
async def test_confirm_email_success(client, db_session, registered_user, user_data):
    result = await db_session.execute(select(User).where(User.email == user_data["email"]))
    user = result.scalars().first()
    token = user.email_confirm_token
    
    # Current API: GET /confirm-email redirects to frontend, confirmation is done via POST
    response = await client.post(f"/api/v1/user/confirm-email?token={token}")
    assert response.status_code == 200
    assert response.json()["msg"] == "Email confirmed successfully"

@pytest.mark.asyncio
async def test_confirm_email_invalid_token(client):
    response = await client.post("/api/v1/user/confirm-email?token=invalid-token")
    assert response.status_code == 404

# --- Profile Tests ---

@pytest.mark.asyncio
async def test_get_profile_success(client, auth_headers, user_data):
    response = await client.get("/api/v1/user/get-profile", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == user_data["email"]

@pytest.mark.asyncio
async def test_get_profile_unauthorized(client):
    response = await client.get("/api/v1/user/get-profile")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_public_profile_success(client, confirmed_user):
    response = await client.get(f"/api/v1/user/get-public-profile/{confirmed_user.id}")
    assert response.status_code == 200
    assert response.json()["username"] == confirmed_user.username

@pytest.mark.asyncio
async def test_get_public_profile_not_found(client):
    response = await client.get("/api/v1/user/get-public-profile/99999")
    assert response.status_code == 404

# --- Update Profile Tests ---

@pytest.mark.asyncio
async def test_change_password_success(client, auth_headers, user_data):
    new_password = "NewStrongPassword123!"
    change_password_data = {
        "old_password": user_data["password"],
        "new_password": new_password
    }
    response = await client.post("/api/v1/user/change-password", json=change_password_data, headers=auth_headers)
    assert response.status_code == 200
    
    # Verify login with new password
    login_data = {
        "email": user_data["email"],
        "password": new_password
    }
    response = await client.post("/api/v1/user/login", json=login_data)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_change_password_wrong_old(client, auth_headers):
    change_password_data = {
        "old_password": "WrongOldPassword",
        "new_password": "NewStrongPassword123!"
    }
    response = await client.post("/api/v1/user/change-password", json=change_password_data, headers=auth_headers)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_change_username_success(client, auth_headers):
    new_username = "newusername"
    response = await client.post("/api/v1/user/change-username", json={"username": new_username}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["msg"] == "Username updated successfully"

@pytest.mark.asyncio
async def test_change_firstname_success(client, auth_headers):
    new_firstname = "NewName"
    response = await client.post("/api/v1/user/change-firstname", json={"firstname": new_firstname}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["msg"] == "Firstname updated"

@pytest.mark.asyncio
async def test_change_lastname_success(client, auth_headers):
    new_lastname = "NewLast"
    response = await client.post("/api/v1/user/change-lastname", json={"lastname": new_lastname}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["msg"] == "Lastname updated"

@pytest.mark.asyncio
async def test_change_middlename_success(client, auth_headers):
    new_middlename = "NewMiddle"
    response = await client.post("/api/v1/user/change-middlename", json={"middlename": new_middlename}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["msg"] == "Middlename updated"

@pytest.mark.asyncio
async def test_change_birthdate_success(client, auth_headers):
    new_birthdate = "1990-01-01"
    response = await client.post("/api/v1/user/change-birthdate", json={"birthdate": new_birthdate}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["msg"] == "Birthdate updated"

@pytest.mark.asyncio
async def test_change_address_success(client, auth_headers):
    new_address = "New Address 123"
    response = await client.post("/api/v1/user/change-address", json={"address": new_address}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["msg"] == "Address updated"

# --- Logout Tests ---

@pytest.mark.asyncio
async def test_logout_success(client, auth_headers):
    # We need to set the cookies in the client for logout to work
    # auth_headers only has Authorization header and X-CSRF-Token
    # But logout endpoint reads refresh_token from cookie
    
    # Let's login again to get cookies set in the client session
    # (Assuming client session persists cookies, which AsyncClient usually does if used as context manager)
    # But here 'client' fixture is a new instance or reset?
    # The 'auth_headers' fixture does a login, but it returns headers.
    # The client instance in 'auth_headers' is the same as passed to test if scope matches.
    # Let's check conftest.py scope. 'client' is function scoped.
    # So 'auth_headers' uses the same client instance.
    
    response = await client.post("/api/v1/user/logout")
    assert response.status_code == 200
    assert "refresh_token" not in response.cookies or response.cookies["refresh_token"] == ""
