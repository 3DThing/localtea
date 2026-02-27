"""
Pydantic schemas for AI Assistant API.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ---------- Enums ----------

class ConversationStatus(str, Enum):
    ACTIVE = "active"
    MANAGER_REQUESTED = "manager_requested"
    MANAGER_CONNECTED = "manager_connected"
    CLOSED = "closed"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    MANAGER = "manager"
    SYSTEM = "system"


# ---------- Messages ----------

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: int
    role: MessageRole
    content: str
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None
    was_filtered: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Conversations ----------

class ConversationCreate(BaseModel):
    """Start a new conversation (can be anonymous or with user token)."""
    message: str = Field(..., min_length=1, max_length=4000)


class ConversationOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    status: ConversationStatus
    title: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationDetail(ConversationOut):
    messages: List[MessageOut] = []
    user_email: Optional[str] = None
    user_username: Optional[str] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    manager_avatar_url: Optional[str] = None
    total_tokens_used: int = 0


class ConversationListItem(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_username: Optional[str] = None
    session_id: Optional[str] = None
    status: ConversationStatus
    title: Optional[str] = None
    message_count: int = 0
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- Admin: Settings ----------

class SettingOut(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    value_type: str = "string"
    group: str = "general"
    description: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str


class SettingBulkUpdate(BaseModel):
    settings: dict[str, str]  # key -> value


# ---------- Admin: RAG ----------

class RAGDocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    category: Optional[str] = None
    source: Optional[str] = None
    keywords: Optional[str] = None


class RAGDocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None
    keywords: Optional[str] = None
    is_active: Optional[bool] = None


class RAGDocumentOut(BaseModel):
    id: int
    title: str
    content: str
    category: Optional[str] = None
    source: Optional[str] = None
    keywords: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- Admin: Banned Phrases ----------

class BannedPhraseCreate(BaseModel):
    phrase: str = Field(..., min_length=1, max_length=255)
    apply_to_input: bool = True
    apply_to_output: bool = True
    action: str = "block"  # block | replace
    replacement: Optional[str] = None


class BannedPhraseUpdate(BaseModel):
    phrase: Optional[str] = None
    apply_to_input: Optional[bool] = None
    apply_to_output: Optional[bool] = None
    action: Optional[str] = None
    replacement: Optional[str] = None
    is_active: Optional[bool] = None


class BannedPhraseOut(BaseModel):
    id: int
    phrase: str
    apply_to_input: bool
    apply_to_output: bool
    action: str
    replacement: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Admin: Statistics ----------

class AssistantStats(BaseModel):
    total_conversations: int = 0
    active_conversations: int = 0
    manager_escalations: int = 0
    closed_conversations: int = 0
    total_messages: int = 0
    filtered_messages: int = 0
    avg_response_time_ms: Optional[float] = None
    total_tokens_used: int = 0
    conversations_today: int = 0
    messages_today: int = 0
    escalations_today: int = 0
    unique_users: int = 0


# ---------- Admin: Manager ----------

class ManagerMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


# ---------- Admin: Telegram Links ----------

class TelegramLinkCreate(BaseModel):
    admin_user_id: int
    telegram_chat_id: str = Field(..., min_length=1, max_length=64)
    telegram_username: Optional[str] = None
    notify_new_conversation: bool = True
    notify_manager_request: bool = True
    notify_new_message: bool = False


class TelegramLinkUpdate(BaseModel):
    telegram_chat_id: Optional[str] = None
    telegram_username: Optional[str] = None
    notify_new_conversation: Optional[bool] = None
    notify_manager_request: Optional[bool] = None
    notify_new_message: Optional[bool] = None
    is_active: Optional[bool] = None


class TelegramLinkOut(BaseModel):
    id: int
    admin_user_id: int
    admin_username: Optional[str] = None
    admin_email: Optional[str] = None
    telegram_chat_id: str
    telegram_username: Optional[str] = None
    notify_new_conversation: bool = True
    notify_manager_request: bool = True
    notify_new_message: bool = False
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Chat design ----------

class ChatDesignUpdate(BaseModel):
    primary_color: Optional[str] = None
    header_text: Optional[str] = None
    placeholder_text: Optional[str] = None
    welcome_message: Optional[str] = None
    position: Optional[str] = None  # bottom-right, bottom-left
    icon_type: Optional[str] = None  # question, chat, custom
    custom_css: Optional[str] = None
