from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.orm import relationship
from backend.db.base_class import Base
from datetime import datetime, timezone

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Email confirmation
    is_email_confirmed = Column(Boolean, default=False)
    email_confirm_token = Column(String, nullable=True, index=True)
    email_confirm_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    new_email_pending = Column(String, nullable=True)
    
    # Profile
    firstname = Column(String, nullable=True)
    lastname = Column(String, nullable=True)
    middlename = Column(String, nullable=True)
    birthdate = Column(Date, nullable=True)
    address = Column(String, nullable=True)
    postal_code = Column(String, nullable=True, index=True)
    phone_number = Column(String, nullable=True, unique=True, index=True)
    avatar_url = Column(String, nullable=True)
    
    # Phone verification
    is_phone_confirmed = Column(Boolean, default=False, server_default='false', nullable=False)
    phone_verification_check_id = Column(String, nullable=True)
    phone_verification_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tokens = relationship("Token", back_populates="user", cascade="all, delete-orphan")
