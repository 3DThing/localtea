from cryptography.fernet import Fernet
from backend.core.config import settings
from datetime import datetime, timedelta, timezone
from jose import jwt
import uuid
import secrets
from typing import Union, Any


fernet = Fernet(settings.TOTP_ENCRYPTION_KEY)

def encrypt_totp_secret(secret: str) -> str:
    return fernet.encrypt(secret.encode()).decode()

def decrypt_totp_secret(encrypted_secret: str) -> str:
    return fernet.decrypt(encrypted_secret.encode()).decode()

def create_pre_auth_token(subject: Union[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=10) # Short lived
    to_encode = {"exp": expire, "sub": str(subject), "type": "pre_auth", "jti": str(uuid.uuid4())}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token_str() -> str:
    return secrets.token_urlsafe(32)


