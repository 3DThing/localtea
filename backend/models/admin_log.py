from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from backend.db.base_class import Base
from datetime import datetime, timezone

class AdminActionLog(Base):
    __tablename__ = "admin_action_log"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    action = Column(String, nullable=False, index=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
