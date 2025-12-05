from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.base_class import Base
from datetime import datetime, timezone

class Token(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    refresh_token = Column(String, unique=True, index=True, nullable=False)
    csrf_token = Column(String, nullable=False)
    
    ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    fingerprint = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)
    rotated_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="tokens")
