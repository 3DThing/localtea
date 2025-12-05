from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from backend.core.config import settings
import hmac
import hashlib
import secrets
import uuid

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access", "jti": str(uuid.uuid4())}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_token_hash(token: str) -> str:
    """
    Hashes a token using SHA256.
    Used for storing refresh tokens securely in the database.
    """
    return hashlib.sha256(token.encode()).hexdigest()

def create_refresh_token_str() -> str:
    return secrets.token_urlsafe(32)

def create_csrf_token() -> str:
    # Generate a random nonce
    nonce = secrets.token_hex(32)
    # Sign it
    signature = hmac.new(
        settings.CSRF_SECRET_KEY.encode(),
        nonce.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{nonce}.{signature}"

def verify_csrf_token(token: str) -> bool:
    try:
        nonce, signature = token.split(".")
        expected_signature = hmac.new(
            settings.CSRF_SECRET_KEY.encode(),
            nonce.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False
