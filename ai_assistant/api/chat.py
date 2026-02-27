"""
User-facing AI Assistant API endpoints.
Chat endpoints for the frontend widget.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.session import get_db
from backend.models.user import User
from ai_assistant.models.assistant import (
    AIConversation, AIMessage, AIConversationStatus, AIMessageRole,
)
from ai_assistant.schemas import (
    ConversationCreate, ConversationOut, MessageCreate, MessageOut,
    ConversationDetail, SettingOut,
)
from ai_assistant.services import ChatService, SettingsService, TelegramService

import logging

logger = logging.getLogger("ai_assistant")

router = APIRouter()


# ---------- Helper: extract user or session ----------

async def _get_user_optional(
    request: Request,
    db: AsyncSession,
) -> Optional[User]:
    """Try to extract authenticated user from Authorization header."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        logger.info("[AUTH] No Authorization header found")
        return None
    
    token = auth.split(" ", 1)[1]
    logger.info(f"[AUTH] Token received: {token[:30]}...")
    try:
        from jose import jwt, JWTError
        from backend.core.config import settings
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.info(f"[AUTH] JWT payload: sub={payload.get('sub')}, type={payload.get('type')}")
        
        if payload.get("type") != "access":
            logger.warning("[AUTH] Token type is not 'access'")
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            logger.warning("[AUTH] No 'sub' in payload")
            return None
        user = await db.get(User, int(user_id))
        if user:
            logger.info(f"[AUTH] Resolved user: id={user.id}, username={user.username}")
        else:
            logger.warning(f"[AUTH] User id={user_id} not found in DB")
        return user
    except Exception as e:
        logger.error(f"[AUTH] Failed to decode token: {type(e).__name__}: {e}")
        return None


# ---------- Public endpoints ----------

@router.get("/config")
async def get_chat_config(db: AsyncSession = Depends(get_db)):
    """Get public chat widget configuration (design, welcome message, enabled status)."""
    enabled = await SettingsService.get_typed(db, "assistant_enabled")
    if not enabled:
        return {"enabled": False}
    
    config = {
        "enabled": True,
        "name": await SettingsService.get(db, "assistant_name"),
        "primary_color": await SettingsService.get(db, "chat_primary_color"),
        "header_text": await SettingsService.get(db, "chat_header_text"),
        "placeholder": await SettingsService.get(db, "chat_placeholder"),
        "welcome_message": await SettingsService.get(db, "chat_welcome_message"),
        "position": await SettingsService.get(db, "chat_position"),
        "custom_css": await SettingsService.get(db, "chat_custom_css"),
        "assistant_avatar_url": await SettingsService.get(db, "assistant_avatar_url") or None,
    }
    return config


@router.post("/conversations", response_model=ConversationDetail)
async def create_conversation(
    data: ConversationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """Start a new conversation with the AI assistant."""
    enabled = await SettingsService.get_typed(db, "assistant_enabled")
    if not enabled:
        raise HTTPException(status_code=503, detail="AI assistant is currently disabled")
    
    user = await _get_user_optional(request, db)
    
    # Rate limit check
    is_limited, limit_msg = await ChatService.check_rate_limit(
        db,
        user_id=user.id if user else None,
        session_id=x_session_id,
    )
    if is_limited:
        raise HTTPException(status_code=429, detail=limit_msg)
    
    conv = await ChatService.get_or_create_conversation(
        db,
        user_id=user.id if user else None,
        session_id=x_session_id,
    )
    
    user_msg, ai_msg = await ChatService.send_message(
        db,
        conversation_id=conv.id,
        content=data.message,
        user_id=user.id if user else None,
        session_id=x_session_id,
    )
    
    # Telegram notification: new conversation
    user_display = (user.username or user.email if user else None) or f"Гость ({x_session_id[:10] if x_session_id else '?'})"
    try:
        await TelegramService.notify_new_conversation(db, conv.id, user_display, data.message)
        # Check if manager was requested (escalation)
        await db.refresh(conv)
        if conv.status == AIConversationStatus.MANAGER_REQUESTED:
            await TelegramService.notify_manager_request(db, conv.id, user_display, data.message)
    except Exception as e:
        logger.warning(f"Telegram notification error: {e}")
    
    # Refresh conversation
    await db.refresh(conv, ["messages"])
    
    messages = [
        MessageOut(
            id=m.id,
            role=m.role.value if hasattr(m.role, 'value') else m.role,
            content=m.content,
            tokens_used=m.tokens_used,
            response_time_ms=m.response_time_ms,
            was_filtered=m.was_filtered,
            created_at=m.created_at,
        )
        for m in conv.messages
    ]
    
    return ConversationDetail(
        id=conv.id,
        user_id=conv.user_id,
        session_id=conv.session_id,
        status=conv.status.value if hasattr(conv.status, 'value') else conv.status,
        title=conv.title,
        message_count=conv.message_count,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        closed_at=conv.closed_at,
        messages=messages,
        total_tokens_used=conv.total_tokens_used,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageOut)
async def send_message(
    conversation_id: int,
    data: MessageCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """Send a message in an existing conversation."""
    enabled = await SettingsService.get_typed(db, "assistant_enabled")
    if not enabled:
        raise HTTPException(status_code=503, detail="AI assistant is currently disabled")
    
    # Verify conversation ownership
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    user = await _get_user_optional(request, db)
    
    # Verify ownership
    if conv.user_id and user and conv.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    if conv.session_id and x_session_id and conv.session_id != x_session_id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    
    # Block messages to closed conversations
    if conv.status == AIConversationStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Диалог завершён. Начните новый чат.")
    
    # Upgrade guest conversation to authenticated user
    if not conv.user_id and user:
        conv.user_id = user.id
        await db.flush()
    
    # Rate limit check
    is_limited, limit_msg = await ChatService.check_rate_limit(
        db,
        user_id=user.id if user else None,
        session_id=x_session_id,
    )
    if is_limited:
        raise HTTPException(status_code=429, detail=limit_msg)
    
    user_msg, ai_msg = await ChatService.send_message(
        db,
        conversation_id=conversation_id,
        content=data.content,
        user_id=user.id if user else None,
        session_id=x_session_id,
    )
    
    # Telegram notifications
    try:
        user_display = (user.username or user.email if user else None) or f"Гость ({x_session_id[:10] if x_session_id else '?'})"
        await TelegramService.notify_new_message(db, conversation_id, user_display, data.content)
        # Check for escalation
        await db.refresh(conv)
        if conv.status == AIConversationStatus.MANAGER_REQUESTED:
            await TelegramService.notify_manager_request(db, conversation_id, user_display, data.content)
    except Exception as e:
        logger.warning(f"Telegram notification error: {e}")
    
    # Return AI response if available, else user msg
    response = ai_msg or user_msg
    return MessageOut(
        id=response.id,
        role=response.role.value if hasattr(response.role, 'value') else response.role,
        content=response.content,
        tokens_used=response.tokens_used,
        response_time_ms=response.response_time_ms,
        was_filtered=response.was_filtered,
        created_at=response.created_at,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """Get conversation with all messages."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    user = await _get_user_optional(request, db)
    
    # Verify ownership
    if conv.user_id and user and conv.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    if conv.session_id and x_session_id and conv.session_id != x_session_id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    
    # Load messages
    result = await db.execute(
        select(AIMessage)
        .where(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at)
    )
    messages_db = list(result.scalars().all())
    
    messages = [
        MessageOut(
            id=m.id,
            role=m.role.value if hasattr(m.role, 'value') else m.role,
            content=m.content,
            tokens_used=m.tokens_used,
            response_time_ms=m.response_time_ms,
            was_filtered=m.was_filtered,
            created_at=m.created_at,
        )
        for m in messages_db
    ]
    
    # Get manager info if manager is connected
    manager_name = None
    manager_avatar_url = None
    if conv.manager_id:
        manager = await db.get(User, conv.manager_id)
        if manager:
            manager_name = manager.username or manager.firstname or "Менеджер"
            manager_avatar_url = manager.avatar_url
    
    return ConversationDetail(
        id=conv.id,
        user_id=conv.user_id,
        session_id=conv.session_id,
        status=conv.status.value if hasattr(conv.status, 'value') else conv.status,
        title=conv.title,
        message_count=conv.message_count,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        closed_at=conv.closed_at,
        messages=messages,
        manager_name=manager_name,
        manager_avatar_url=manager_avatar_url,
        total_tokens_used=conv.total_tokens_used,
    )


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID"),
):
    """Get all messages for a conversation (polling endpoint)."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    user = await _get_user_optional(request, db)
    
    if conv.user_id and user and conv.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    if conv.session_id and x_session_id and conv.session_id != x_session_id:
        raise HTTPException(status_code=403, detail="Not your conversation")
    
    result = await db.execute(
        select(AIMessage)
        .where(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at)
    )
    messages_db = list(result.scalars().all())
    
    # Get manager info if manager is connected
    manager_name = None
    manager_avatar_url = None
    if conv.manager_id:
        manager = await db.get(User, conv.manager_id)
        if manager:
            manager_name = manager.username or manager.firstname or "Менеджер"
            manager_avatar_url = manager.avatar_url
    
    return {
        "conversation_id": conversation_id,
        "status": conv.status.value if hasattr(conv.status, 'value') else conv.status,
        "manager_name": manager_name,
        "manager_avatar_url": manager_avatar_url,
        "messages": [
            {
                "id": m.id,
                "role": m.role.value if hasattr(m.role, 'value') else m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages_db
        ],
    }
