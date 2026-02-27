"""
Admin API endpoints for AI Assistant management.
All endpoints require admin authentication.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from backend.db.session import get_db
from backend.models.user import User
from admin_backend.core.deps import get_current_admin
from ai_assistant.models.assistant import (
    AIAssistantSettings, AIConversation, AIMessage,
    AIRAGDocument, AIBannedPhrase,
    AIConversationStatus, AIMessageRole,
    AITelegramLink,
)
from ai_assistant.schemas import (
    SettingOut, SettingUpdate, SettingBulkUpdate,
    RAGDocumentCreate, RAGDocumentUpdate, RAGDocumentOut,
    BannedPhraseCreate, BannedPhraseUpdate, BannedPhraseOut,
    ConversationListItem, ConversationDetail, MessageOut,
    AssistantStats, ManagerMessageCreate,
    TelegramLinkCreate, TelegramLinkUpdate, TelegramLinkOut,
)
from ai_assistant.services import SettingsService, ChatService, TelegramService
import logging
import os
import uuid

logger = logging.getLogger("ai_assistant")

router = APIRouter()


# ==================== SETTINGS ====================

@router.get("/settings", response_model=list[SettingOut])
async def get_all_settings(
    group: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get all AI assistant settings."""
    await SettingsService.ensure_defaults(db)
    if group:
        settings = await SettingsService.get_by_group(db, group)
    else:
        settings = await SettingsService.get_all(db)
    return settings


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update a single setting."""
    await SettingsService.set(db, key, data.value)
    return {"status": "ok", "key": key}


@router.put("/settings")
async def update_settings_bulk(
    data: SettingBulkUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update multiple settings at once."""
    await SettingsService.set_bulk(db, data.settings)
    return {"status": "ok", "updated": len(data.settings)}


# ==================== CONVERSATIONS ====================

@router.get("/conversations")
async def list_conversations(
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all conversations with filtering."""
    conversations, total = await ChatService.get_conversations(
        db, status=status, user_id=user_id, search=search,
        date_from=date_from, date_to=date_to, skip=skip, limit=limit,
    )
    
    items = []
    for conv in conversations:
        # Get user info
        user_email = None
        user_username = None
        if conv.user_id:
            user = await db.get(User, conv.user_id)
            if user:
                user_email = user.email
                user_username = user.username
        
        # Get last message
        last_msg_result = await db.execute(
            select(AIMessage.content)
            .where(AIMessage.conversation_id == conv.id)
            .order_by(desc(AIMessage.created_at))
            .limit(1)
        )
        last_message = last_msg_result.scalar()
        
        items.append(ConversationListItem(
            id=conv.id,
            user_id=conv.user_id,
            user_email=user_email,
            user_username=user_username,
            session_id=conv.session_id,
            status=conv.status.value if hasattr(conv.status, 'value') else conv.status,
            title=conv.title,
            message_count=conv.message_count,
            last_message=last_message[:200] if last_message else None,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        ))
    
    return {"items": items, "total": total}


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get conversation details with all messages."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    result = await db.execute(
        select(AIMessage)
        .where(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at)
    )
    messages_db = list(result.scalars().all())
    
    # Get user info
    user_email = None
    user_username = None
    if conv.user_id:
        user = await db.get(User, conv.user_id)
        if user:
            user_email = user.email
            user_username = user.username
    
    # Get manager info
    manager_name = None
    manager_avatar_url = None
    if conv.manager_id:
        manager = await db.get(User, conv.manager_id)
        if manager:
            manager_name = manager.username or manager.firstname or "Менеджер"
            manager_avatar_url = manager.avatar_url
    
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
        user_email=user_email,
        user_username=user_username,
        manager_id=conv.manager_id,
        manager_name=manager_name,
        manager_avatar_url=manager_avatar_url,
        total_tokens_used=conv.total_tokens_used,
    )


@router.post("/conversations/{conversation_id}/switch-to-manager")
async def switch_to_manager(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Switch conversation from AI mode to manager mode."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv.status = AIConversationStatus.MANAGER_CONNECTED
    conv.manager_id = admin.id
    
    # Add system message
    system_msg = AIMessage(
        conversation_id=conversation_id,
        role=AIMessageRole.SYSTEM,
        content="Менеджер подключился к чату.",
    )
    db.add(system_msg)
    await db.commit()
    
    return {"status": "ok", "conversation_status": "manager_connected"}


@router.post("/conversations/{conversation_id}/switch-to-ai")
async def switch_to_ai(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Switch conversation back to AI mode."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv.status = AIConversationStatus.ACTIVE
    conv.manager_id = None
    
    system_msg = AIMessage(
        conversation_id=conversation_id,
        role=AIMessageRole.SYSTEM,
        content="Чат переведён обратно в режим AI ассистента.",
    )
    db.add(system_msg)
    await db.commit()
    
    return {"status": "ok", "conversation_status": "active"}


@router.post("/settings/upload-avatar")
async def upload_assistant_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Upload avatar image for the AI assistant and save the URL to settings."""
    from PIL import Image
    from backend.core.config import settings as app_settings

    if not file.filename:
        raise HTTPException(status_code=422, detail="Invalid filename")
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ('jpg', 'jpeg', 'png', 'webp'):
        raise HTTPException(status_code=422, detail="Unsupported format. Use JPG, PNG or WEBP")

    upload_dir = "/app/uploads/user/ai_agent"
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}.webp"
    filepath = f"{upload_dir}/{filename}"

    try:
        img = Image.open(file.file)
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        max_size = 512
        if img.width > max_size or img.height > max_size:
            ratio = max_size / max(img.width, img.height)
            img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
        img.save(filepath, "WEBP", quality=85)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {e}")

    base_url = (getattr(app_settings, 'UPLOADS_BASE_URL', None) or app_settings.API_BASE_URL).rstrip('/')
    avatar_url = f"{base_url}/uploads/user/ai_agent/{filename}"

    await SettingsService.set(db, "assistant_avatar_url", avatar_url)
    return {"avatar_url": avatar_url}


@router.delete("/settings/avatar")
async def delete_assistant_avatar(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Remove the AI assistant avatar."""
    await SettingsService.set(db, "assistant_avatar_url", "")
    return {"status": "ok"}



async def close_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Close a conversation and send a close message to the user."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get configurable close message
    from ai_assistant.services import SettingsService
    close_msg_text = await SettingsService.get(db, "conversation_close_message") or "Диалог завершён."
    
    # Add close message so the user sees it
    close_msg = AIMessage(
        conversation_id=conversation_id,
        role=AIMessageRole.SYSTEM,
        content=close_msg_text,
    )
    db.add(close_msg)
    
    conv.status = AIConversationStatus.CLOSED
    conv.closed_at = datetime.utcnow()
    conv.message_count += 1
    await db.commit()
    
    return {"status": "ok"}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a conversation and all its messages."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    await db.delete(conv)
    await db.commit()
    
    return {"status": "ok"}


@router.post("/conversations/{conversation_id}/manager-message", response_model=MessageOut)
async def send_manager_message(
    conversation_id: int,
    data: ManagerMessageCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Send a message as manager in a conversation."""
    conv = await db.get(AIConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if conv.status not in (AIConversationStatus.MANAGER_CONNECTED, AIConversationStatus.MANAGER_REQUESTED):
        # Auto-switch to manager mode
        conv.status = AIConversationStatus.MANAGER_CONNECTED
        conv.manager_id = admin.id
    
    msg = AIMessage(
        conversation_id=conversation_id,
        role=AIMessageRole.MANAGER,
        content=data.content,
    )
    db.add(msg)
    conv.message_count += 1
    await db.commit()
    await db.refresh(msg)
    
    return MessageOut(
        id=msg.id,
        role="manager",
        content=msg.content,
        created_at=msg.created_at,
    )


# ==================== RAG DOCUMENTS ====================

@router.get("/rag", response_model=list[RAGDocumentOut])
async def list_rag_documents(
    category: Optional[str] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all RAG knowledge base documents."""
    q = select(AIRAGDocument)
    if category:
        q = q.where(AIRAGDocument.category == category)
    if active_only:
        q = q.where(AIRAGDocument.is_active == True)
    q = q.order_by(AIRAGDocument.category, AIRAGDocument.title)
    
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/rag", response_model=RAGDocumentOut)
async def create_rag_document(
    data: RAGDocumentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Add a new RAG document."""
    doc = AIRAGDocument(
        title=data.title,
        content=data.content,
        category=data.category,
        source=data.source,
        keywords=data.keywords,
        created_by=admin.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.put("/rag/{doc_id}", response_model=RAGDocumentOut)
async def update_rag_document(
    doc_id: int,
    data: RAGDocumentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update a RAG document."""
    doc = await db.get(AIRAGDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/rag/{doc_id}")
async def delete_rag_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a RAG document."""
    doc = await db.get(AIRAGDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.delete(doc)
    await db.commit()
    return {"status": "ok"}


# ==================== BANNED PHRASES ====================

@router.get("/banned-phrases", response_model=list[BannedPhraseOut])
async def list_banned_phrases(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all banned phrases."""
    result = await db.execute(
        select(AIBannedPhrase).order_by(AIBannedPhrase.phrase)
    )
    return list(result.scalars().all())


@router.post("/banned-phrases", response_model=BannedPhraseOut)
async def create_banned_phrase(
    data: BannedPhraseCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Add a new banned phrase."""
    # Check duplicate
    exists = await db.scalar(
        select(AIBannedPhrase.id).where(AIBannedPhrase.phrase == data.phrase)
    )
    if exists:
        raise HTTPException(status_code=409, detail="Phrase already exists")
    
    phrase = AIBannedPhrase(
        phrase=data.phrase,
        apply_to_input=data.apply_to_input,
        apply_to_output=data.apply_to_output,
        action=data.action,
        replacement=data.replacement,
    )
    db.add(phrase)
    await db.commit()
    await db.refresh(phrase)
    return phrase


@router.put("/banned-phrases/{phrase_id}", response_model=BannedPhraseOut)
async def update_banned_phrase(
    phrase_id: int,
    data: BannedPhraseUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update a banned phrase."""
    phrase = await db.get(AIBannedPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=404, detail="Phrase not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(phrase, field, value)
    
    await db.commit()
    await db.refresh(phrase)
    return phrase


@router.delete("/banned-phrases/{phrase_id}")
async def delete_banned_phrase(
    phrase_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a banned phrase."""
    phrase = await db.get(AIBannedPhrase, phrase_id)
    if not phrase:
        raise HTTPException(status_code=404, detail="Phrase not found")
    
    await db.delete(phrase)
    await db.commit()
    return {"status": "ok"}


# ==================== STATISTICS ====================

@router.get("/stats", response_model=AssistantStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get AI assistant usage statistics."""
    return await ChatService.get_stats(db)


@router.post("/telegram/test")
async def test_telegram(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Test Telegram bot connection by sending a test message to admin's linked chat."""
    bot_token = await SettingsService.get(db, "telegram_bot_token")
    if not bot_token:
        raise HTTPException(status_code=400, detail="Укажите токен бота в настройках")
    
    # Find admin's link
    link = await db.scalar(
        select(AITelegramLink).where(
            AITelegramLink.admin_user_id == admin.id,
            AITelegramLink.is_active == True,
        )
    )
    if not link:
        raise HTTPException(status_code=400, detail="У вас нет привязанного Telegram. Добавьте привязку.")
    
    ok, message = await TelegramService.test_link(db, link.id)
    if ok:
        return {"status": "ok", "message": message}
    raise HTTPException(status_code=400, detail=message)


# ==================== TELEGRAM LINKS ====================

@router.get("/telegram/links")
async def list_telegram_links(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List all telegram link bindings."""
    result = await db.execute(
        select(AITelegramLink).order_by(AITelegramLink.created_at)
    )
    links = list(result.scalars().all())
    
    items = []
    for link in links:
        admin_user = await db.get(User, link.admin_user_id)
        items.append(TelegramLinkOut(
            id=link.id,
            admin_user_id=link.admin_user_id,
            admin_username=admin_user.username if admin_user else None,
            admin_email=admin_user.email if admin_user else None,
            telegram_chat_id=link.telegram_chat_id,
            telegram_username=link.telegram_username,
            notify_new_conversation=link.notify_new_conversation,
            notify_manager_request=link.notify_manager_request,
            notify_new_message=link.notify_new_message,
            is_active=link.is_active,
            created_at=link.created_at,
        ))
    return items


@router.post("/telegram/links")
async def create_telegram_link(
    data: TelegramLinkCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a new telegram link binding."""
    target_user = await db.get(User, data.admin_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    link = AITelegramLink(
        admin_user_id=data.admin_user_id,
        telegram_chat_id=data.telegram_chat_id,
        telegram_username=data.telegram_username,
        notify_new_conversation=data.notify_new_conversation,
        notify_manager_request=data.notify_manager_request,
        notify_new_message=data.notify_new_message,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    
    return TelegramLinkOut(
        id=link.id,
        admin_user_id=link.admin_user_id,
        admin_username=target_user.username,
        admin_email=target_user.email,
        telegram_chat_id=link.telegram_chat_id,
        telegram_username=link.telegram_username,
        notify_new_conversation=link.notify_new_conversation,
        notify_manager_request=link.notify_manager_request,
        notify_new_message=link.notify_new_message,
        is_active=link.is_active,
        created_at=link.created_at,
    )


@router.put("/telegram/links/{link_id}")
async def update_telegram_link(
    link_id: int,
    data: TelegramLinkUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update a telegram link binding."""
    link = await db.get(AITelegramLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Привязка не найдена")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(link, field, value)
    
    await db.commit()
    await db.refresh(link)
    
    admin_user = await db.get(User, link.admin_user_id)
    return TelegramLinkOut(
        id=link.id,
        admin_user_id=link.admin_user_id,
        admin_username=admin_user.username if admin_user else None,
        admin_email=admin_user.email if admin_user else None,
        telegram_chat_id=link.telegram_chat_id,
        telegram_username=link.telegram_username,
        notify_new_conversation=link.notify_new_conversation,
        notify_manager_request=link.notify_manager_request,
        notify_new_message=link.notify_new_message,
        is_active=link.is_active,
        created_at=link.created_at,
    )


@router.delete("/telegram/links/{link_id}")
async def delete_telegram_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete a telegram link."""
    link = await db.get(AITelegramLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Привязка не найдена")
    await db.delete(link)
    await db.commit()
    return {"status": "ok"}


@router.post("/telegram/links/{link_id}/test")
async def test_telegram_link(
    link_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Send a test message to a specific telegram link."""
    ok, message = await TelegramService.test_link(db, link_id)
    if ok:
        return {"status": "ok", "message": message}
    raise HTTPException(status_code=400, detail=message)


@router.get("/telegram/admins")
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """List admin users for linking (only superusers)."""
    result = await db.execute(
        select(User).where(User.is_superuser == True).order_by(User.username)
    )
    users = list(result.scalars().all())
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
        }
        for u in users
    ]
