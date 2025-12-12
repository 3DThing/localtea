"""
Store settings model for key-value configuration.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from backend.db.base_class import Base


class StoreSetting(Base):
    """Key-value store for application settings."""
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, index=True)
    
    # Setting key (unique)
    key = Column(String(100), unique=True, nullable=False, index=True)
    
    # Setting value (JSON string for complex values)
    value = Column(Text, nullable=True)
    
    # Value type for parsing
    value_type = Column(String(20), default="string")  # string, int, float, bool, json
    
    # Group for categorization
    group = Column(String(50), default="general")  # general, shipping, payment, email, seo
    
    # Description for admins
    description = Column(String(500), nullable=True)
    
    # Is this setting public (can be fetched without auth)?
    is_public = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def get_typed_value(self):
        """Get value with proper type conversion."""
        if self.value is None:
            return None
        
        if self.value_type == "int":
            return int(self.value)
        elif self.value_type == "float":
            return float(self.value)
        elif self.value_type == "bool":
            return self.value.lower() in ("true", "1", "yes")
        elif self.value_type == "json":
            import json
            return json.loads(self.value)
        else:
            return self.value
