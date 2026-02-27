"""
AI Assistant database models.
Models for chat conversations, messages, RAG documents, banned phrases, and settings.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float,
    ForeignKey, Enum, Index, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.base_class import Base


class AIConversationStatus(str, enum.Enum):
    """Status of a conversation."""
    ACTIVE = "active"              # AI is responding
    MANAGER_REQUESTED = "manager_requested"  # User asked for manager
    MANAGER_CONNECTED = "manager_connected"  # Manager took over
    CLOSED = "closed"              # Conversation ended


class AIMessageRole(str, enum.Enum):
    """Role of a message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    MANAGER = "manager"
    SYSTEM = "system"


class AIAssistantSettings(Base):
    """Global AI assistant settings (singleton-like, keyed by 'key')."""
    __tablename__ = "ai_assistant_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(20), default="string")  # string, int, float, bool, json
    group = Column(String(50), default="general")
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AIConversation(Base):
    """A conversation between a user and the AI assistant."""
    __tablename__ = "ai_conversation"

    id = Column(Integer, primary_key=True, index=True)
    
    # Link to registered user (nullable for anonymous)
    user_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Anonymous session identifier
    session_id = Column(String(128), nullable=True, index=True)
    
    # Status
    status = Column(
        Enum(AIConversationStatus, name="ai_conversation_status", values_callable=lambda x: [e.value for e in x]),
        default=AIConversationStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    
    # Manager who took over (admin user id)
    manager_id = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)
    
    # Metadata
    title = Column(String(255), nullable=True)  # Auto-generated from first message
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Statistics
    message_count = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    
    # Relationships
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at")
    user = relationship("User", foreign_keys=[user_id])
    manager = relationship("User", foreign_keys=[manager_id])

    __table_args__ = (
        Index("ix_ai_conversation_created", "created_at"),
        Index("ix_ai_conversation_status_updated", "status", "updated_at"),
    )


class AIMessage(Base):
    """A single message in a conversation."""
    __tablename__ = "ai_message"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversation.id", ondelete="CASCADE"), nullable=False, index=True)
    
    role = Column(
        Enum(AIMessageRole, name="ai_message_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    content = Column(Text, nullable=False)
    
    # AI response metadata
    tokens_used = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)  # Time to generate response in ms
    model_used = Column(String(100), nullable=True)
    
    # Moderation flags
    was_filtered = Column(Boolean, default=False)  # Content was filtered by banned words
    original_content = Column(Text, nullable=True)  # Original content before filtering
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")

    __table_args__ = (
        Index("ix_ai_message_conv_created", "conversation_id", "created_at"),
    )


class AIRAGDocument(Base):
    """RAG knowledge base document."""
    __tablename__ = "ai_rag_document"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True, index=True)  # e.g., 'tea_types', 'brewing', 'general'
    source = Column(String(255), nullable=True)  # Where this info came from
    
    is_active = Column(Boolean, default=True, index=True)
    
    # For search relevance
    keywords = Column(Text, nullable=True)  # Comma-separated keywords
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(Integer, ForeignKey("user.id", ondelete="SET NULL"), nullable=True)


class AIBannedPhrase(Base):
    """Banned words/phrases for content filtering."""
    __tablename__ = "ai_banned_phrase"

    id = Column(Integer, primary_key=True, index=True)
    phrase = Column(String(255), unique=True, nullable=False, index=True)
    
    # Where to apply
    apply_to_input = Column(Boolean, default=True)   # Filter user input
    apply_to_output = Column(Boolean, default=True)   # Filter AI output
    
    # Action: 'block' = reject entirely, 'replace' = replace with placeholder
    action = Column(String(20), default="block")
    replacement = Column(String(255), nullable=True)  # Text to replace with (if action='replace')
    
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AITelegramLink(Base):
    """Link between an admin user and their Telegram account for notifications and replies."""
    __tablename__ = "ai_telegram_link"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    telegram_chat_id = Column(String(64), nullable=False, index=True)
    telegram_username = Column(String(128), nullable=True)
    
    # Per-user notification preferences
    notify_new_conversation = Column(Boolean, default=True)
    notify_manager_request = Column(Boolean, default=True)
    notify_new_message = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    admin_user = relationship("User", foreign_keys=[admin_user_id])

    __table_args__ = (
        Index("ix_ai_telegram_link_chat_id", "telegram_chat_id"),
    )
