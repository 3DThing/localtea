from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.base_class import Base
from datetime import datetime, timezone

class Admin2FA(Base):
    __tablename__ = "admin_2fa"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, unique=True)
    secret = Column(String, nullable=False) # Encrypted via Fernet
    is_enabled = Column(Boolean, default=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", backref="admin_2fa")
