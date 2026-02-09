from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "LocalTea"
    SECRET_KEY: str
    CSRF_SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str
    MIGRATION_DATABASE_URL: Optional[str] = None
    REDIS_URL: str
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://5.129.219.127:3000",
        "https://localtea.ru"
    ]

    DEBUG: bool = False
    CSRF_ENABLED: bool = True

    # Email
    SMTP_SERVER: str
    SMTP_PORT: int = 465
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAILS_FROM_EMAIL: str
    EMAILS_FROM_NAME: str = "LocalTea"

    # Payment (Yookassa)
    YOOKASSA_SHOP_ID: Optional[str] = None
    YOOKASSA_SECRET_KEY: Optional[str] = None
    YOOKASSA_RETURN_URL: str = "https://localtea.ru/payment/success"
    YOOKASSA_WEBHOOK_URL: str = "https://api.localtea.ru/api/v1/webhooks/payment/yookassa"

    # Phone verification (sms.ru)
    SMS_RU_API_ID: Optional[str] = None
    PHONE_VERIFICATION_TIMEOUT: int = 300  # 5 минут

    # Delivery (Russian Post)
    SENDER_POSTAL_CODE: str = "111020"  # Индекс склада отправителя

    TOTP_ENCRYPTION_KEY: str

    # Base URLs for email links and frontend
    BASE_URL: str = "https://localtea.ru"
    API_BASE_URL: str = "https://api.localtea.ru"
    UPLOADS_BASE_URL: Optional[str] = None

    # Prefer a single unified .env in the repo root.
    # When running from repo root (/app), ".env" is found.
    # When running from a subfolder (e.g. /app/backend), fall back to "../.env".
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")


settings = Settings()
