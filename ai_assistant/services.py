"""
AI Assistant service — core logic for chat, RAG, content filtering, OpenAI integration.
"""
import time
import json
import logging
import re
import asyncio
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, and_, or_, desc
from datetime import datetime, timezone, timedelta

from ai_assistant.models.assistant import (
    AIAssistantSettings,
    AIConversation,
    AIMessage,
    AIRAGDocument,
    AIBannedPhrase,
    AIConversationStatus,
    AIMessageRole,
    AITelegramLink,
)
from ai_assistant.schemas import AssistantStats

import httpx

logger = logging.getLogger("ai_assistant")


# ==================== DEFAULT SETTINGS ====================

DEFAULT_SETTINGS = {
    # General
    "assistant_enabled": {"value": "true", "type": "bool", "group": "general", "desc": "Включить/выключить AI ассистента"},
    "assistant_name": {"value": "Чайный помощник", "type": "string", "group": "general", "desc": "Имя ассистента"},
    
    # Model
    "openai_base_url": {
        "value": "https://agent.timeweb.cloud/api/v1/cloud-ai/agents/91ae96bf-222d-4ed7-87c5-0379618b9d59/v1",
        "type": "string", "group": "model", "desc": "Base URL для OpenAI-совместимого API"
    },
    "openai_api_key": {
        "value": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoiY2czNzY2NCIsInR5cGUiOiJhcGlfa2V5IiwiYXBpX2tleV9pZCI6IjJhOWQ5MDY1LWFmYTctNDkxMy1iMGUwLWU5ZjY2MzQ0ZGFiNiIsImlhdCI6MTc3MjE4Mjk3Mn0.ccGAlLci_C27HL-lxX8ZHVjTy6GICA4ZkDLBkUHFa1ZcePlFOcGFjizK3BUAoWEIb55KwQr7wPMSI35NI-DbVXnYYanhDW8doP-PnoYOHWaLlHSdAAWg2Uk4YK9OWLxuZmSl4uKTD_D7KINeV_M9Ii1J8P1o8HJwsGc7P1x5AAfDhIytRH-9pNx1e0Z7GDk-JLFVh7wjMYTwMEF18drXMJAf_37nmT5PUKiO0ds_8WG0wtWZPN5DDVremNYhfux2ESQ50u-OhGRtTRjKmnll7vw0ILQF-LjWiPAn25CL7QQDOCdF1mB_YyxsL44OjKmYRtv-R6q_KwAaftSsQeflP9DYxDRSoBO5eX3-YDiIjqt3x5ok5Q_xXDDOkWst3_2e74tqC0OTaaMVLjpKRL_QCgNOHTKH7ypvXfTyQet5p_rb1vmsaKaX5iDBVqTuzoIVTL9VhA1G26FPcQDbHQZB2FjyIL0Hq9dx_-1bXIdcxIh6BNQFvQlQa5M3IiXA2ycG",
        "type": "string", "group": "model", "desc": "API ключ (токен)"
    },
    "openai_model": {"value": "gpt-4o-mini", "type": "string", "group": "model", "desc": "Модель для генерации ответов"},
    "temperature": {"value": "0.7", "type": "float", "group": "model", "desc": "Температура генерации (0.0-2.0)"},
    "max_tokens": {"value": "1024", "type": "int", "group": "model", "desc": "Максимальная длина ответа в токенах"},
    "context_messages_limit": {"value": "20", "type": "int", "group": "model", "desc": "Количество предыдущих сообщений для контекста"},
    
    # System prompt
    "system_prompt": {
        "value": """Ты — дружелюбный и знающий чайный консультант магазина LocalTea. Твои задачи:

1. Консультировать покупателей по различным сортам чая (чёрный, зелёный, белый, улун, пуэр, травяной).
2. Рекомендовать чай на основе предпочтений клиента (вкус, крепость, аромат, время суток).
3. Объяснять способы заваривания различных сортов чая (температура воды, время заваривания, пропорции).
4. Рассказывать о свойствах и пользе чая для здоровья.
5. Помогать с выбором подарочных наборов.
6. Отвечать на вопросы о доставке и оформлении заказов.

Правила:
- Отвечай на русском языке.
- Будь вежливым, дружелюбным и профессиональным.
- Если вопрос выходит за рамки твоей компетенции, предложи связаться с менеджером.
- Не обсуждай темы, не связанные с чаем и магазином.
- Давай краткие, но информативные ответы.
- Если клиент спрашивает цены, направь его в каталог на сайте.
- Используй эмодзи умеренно для создания дружелюбной атмосферы 🍵""",
        "type": "string", "group": "system_prompt", "desc": "Системный промт для ассистента"
    },

    # Manager escalation
    "manager_keywords": {
        "value": json.dumps([
            "менеджер", "оператор", "человек", "живой человек",
            "позвать менеджера", "связаться с менеджером",
            "хочу поговорить с человеком", "реальный человек",
            "manager", "operator", "human"
        ], ensure_ascii=False),
        "type": "json", "group": "manager", "desc": "Ключевые фразы для перевода на менеджера"
    },
    "manager_notification_enabled": {"value": "true", "type": "bool", "group": "manager", "desc": "Уведомлять менеджера о запросах"},
    
    # Design
    "chat_primary_color": {"value": "#d4894f", "type": "string", "group": "design", "desc": "Основной цвет чата"},
    "chat_header_text": {"value": "Чайный помощник 🍵", "type": "string", "group": "design", "desc": "Заголовок окна чата"},
    "chat_placeholder": {"value": "Задайте вопрос о чае...", "type": "string", "group": "design", "desc": "Placeholder в поле ввода"},
    "chat_welcome_message": {
        "value": "Здравствуйте! 🍵 Я чайный помощник LocalTea. Помогу подобрать чай, расскажу о способах заваривания или отвечу на любые вопросы о нашем магазине. Чем могу помочь?",
        "type": "string", "group": "design", "desc": "Приветственное сообщение"
    },
    "chat_position": {"value": "bottom-right", "type": "string", "group": "design", "desc": "Позиция кнопки (bottom-right, bottom-left)"},
    "chat_custom_css": {"value": "", "type": "string", "group": "design", "desc": "Пользовательский CSS"},
    "assistant_avatar_url": {"value": "", "type": "string", "group": "design", "desc": "URL аватарки ИИ агента (загружается в панели дизайна)"},

    # Rate limiting
    "rate_limit_per_minute": {"value": "5", "type": "int", "group": "rate_limit", "desc": "Максимум сообщений в минуту (0 = без лимита)"},
    "rate_limit_per_hour": {"value": "60", "type": "int", "group": "rate_limit", "desc": "Максимум сообщений в час (0 = без лимита)"},
    "rate_limit_message": {
        "value": "Вы отправляете сообщения слишком часто. Пожалуйста, подождите немного. ☕",
        "type": "string", "group": "rate_limit", "desc": "Сообщение при превышении лимита"
    },

    # Conversation close
    "conversation_close_message": {
        "value": "Диалог завершён. Спасибо за обращение! Если у вас появятся новые вопросы — создайте новый чат. 🍵",
        "type": "string", "group": "manager", "desc": "Сообщение при закрытии диалога (отправляется пользователю)"
    },

    # Telegram notifications
    "telegram_enabled": {"value": "false", "type": "bool", "group": "telegram", "desc": "Включить Telegram уведомления"},
    "telegram_bot_token": {"value": "", "type": "string", "group": "telegram", "desc": "Токен бота (получить у @BotFather)"},
}


# ==================== SETTINGS SERVICE ====================

class SettingsService:
    """Manage AI assistant settings."""

    @staticmethod
    async def ensure_defaults(db: AsyncSession):
        """Create default settings if they don't exist."""
        for key, data in DEFAULT_SETTINGS.items():
            exists = await db.scalar(
                select(AIAssistantSettings.id).where(AIAssistantSettings.key == key)
            )
            if not exists:
                setting = AIAssistantSettings(
                    key=key,
                    value=data["value"],
                    value_type=data["type"],
                    group=data["group"],
                    description=data["desc"],
                )
                db.add(setting)
        await db.commit()

    @staticmethod
    async def get_all(db: AsyncSession) -> list[AIAssistantSettings]:
        result = await db.execute(
            select(AIAssistantSettings).order_by(AIAssistantSettings.group, AIAssistantSettings.key)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_group(db: AsyncSession, group: str) -> list[AIAssistantSettings]:
        result = await db.execute(
            select(AIAssistantSettings)
            .where(AIAssistantSettings.group == group)
            .order_by(AIAssistantSettings.key)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, key: str) -> Optional[str]:
        setting = await db.scalar(
            select(AIAssistantSettings.value).where(AIAssistantSettings.key == key)
        )
        if setting is None:
            default = DEFAULT_SETTINGS.get(key)
            return default["value"] if default else None
        return setting

    @staticmethod
    async def get_typed(db: AsyncSession, key: str):
        """Get setting with type conversion."""
        raw = await SettingsService.get(db, key)
        if raw is None:
            return None
        default = DEFAULT_SETTINGS.get(key, {})
        vtype = default.get("type", "string")
        
        # Get actual value_type from DB if exists
        db_type = await db.scalar(
            select(AIAssistantSettings.value_type).where(AIAssistantSettings.key == key)
        )
        if db_type:
            vtype = db_type
        
        if vtype == "bool":
            return raw.lower() in ("true", "1", "yes")
        elif vtype == "int":
            return int(raw)
        elif vtype == "float":
            return float(raw)
        elif vtype == "json":
            return json.loads(raw)
        return raw

    @staticmethod
    async def set(db: AsyncSession, key: str, value: str):
        existing = await db.scalar(
            select(AIAssistantSettings).where(AIAssistantSettings.key == key)
        )
        if existing:
            existing.value = value
            existing.updated_at = datetime.now(timezone.utc)
        else:
            default = DEFAULT_SETTINGS.get(key, {})
            db.add(AIAssistantSettings(
                key=key,
                value=value,
                value_type=default.get("type", "string"),
                group=default.get("group", "general"),
                description=default.get("desc"),
            ))
        await db.commit()

    @staticmethod
    async def set_bulk(db: AsyncSession, settings_dict: dict[str, str]):
        for key, value in settings_dict.items():
            await SettingsService.set(db, key, value)


# ==================== CONTENT FILTER ====================

class ContentFilter:
    """Filter banned words/phrases from user input and AI output."""

    @staticmethod
    async def get_banned_phrases(db: AsyncSession, for_input: bool = True) -> list[AIBannedPhrase]:
        q = select(AIBannedPhrase).where(AIBannedPhrase.is_active == True)
        if for_input:
            q = q.where(AIBannedPhrase.apply_to_input == True)
        else:
            q = q.where(AIBannedPhrase.apply_to_output == True)
        result = await db.execute(q)
        return list(result.scalars().all())

    @staticmethod
    async def check_input(db: AsyncSession, text: str) -> Tuple[bool, str]:
        """
        Check user input against banned phrases.
        Returns (is_blocked, filtered_text).
        """
        phrases = await ContentFilter.get_banned_phrases(db, for_input=True)
        lowered = text.lower()
        
        for phrase in phrases:
            if phrase.phrase.lower() in lowered:
                if phrase.action == "block":
                    return True, text
                elif phrase.action == "replace":
                    pattern = re.compile(re.escape(phrase.phrase), re.IGNORECASE)
                    text = pattern.sub(phrase.replacement or "***", text)
        
        return False, text

    @staticmethod
    async def filter_output(db: AsyncSession, text: str) -> Tuple[bool, str, Optional[str]]:
        """
        Filter AI output.
        Returns (was_filtered, filtered_text, original_text_if_filtered).
        """
        phrases = await ContentFilter.get_banned_phrases(db, for_input=False)
        original = text
        was_filtered = False
        
        for phrase in phrases:
            if phrase.phrase.lower() in text.lower():
                was_filtered = True
                pattern = re.compile(re.escape(phrase.phrase), re.IGNORECASE)
                text = pattern.sub(phrase.replacement or "***", text)
        
        return was_filtered, text, (original if was_filtered else None)


# ==================== RAG SERVICE ====================

class RAGService:
    """Retrieve relevant knowledge base documents for context."""

    @staticmethod
    async def search(db: AsyncSession, query: str, limit: int = 5) -> list[AIRAGDocument]:
        """Simple keyword-based search in RAG documents."""
        query_lower = query.lower()
        words = query_lower.split()
        
        # Get all active documents
        result = await db.execute(
            select(AIRAGDocument).where(AIRAGDocument.is_active == True)
        )
        docs = list(result.scalars().all())
        
        # Score documents by keyword overlap
        scored = []
        for doc in docs:
            score = 0
            searchable = f"{doc.title} {doc.content} {doc.keywords or ''}".lower()
            for word in words:
                if len(word) > 2 and word in searchable:
                    score += 1
            if score > 0:
                scored.append((score, doc))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:limit]]

    @staticmethod
    def format_context(docs: list[AIRAGDocument]) -> str:
        """Format RAG documents as context for the prompt."""
        if not docs:
            return ""
        
        parts = ["Используй следующую информацию из базы знаний для ответа:\n"]
        for doc in docs:
            parts.append(f"### {doc.title}")
            parts.append(doc.content)
            parts.append("")
        
        return "\n".join(parts)


# ==================== OPENAI CLIENT ====================

class OpenAIClient:
    """Client for OpenAI-compatible API."""

    @staticmethod
    async def chat_completion(
        messages: list[dict],
        base_url: str,
        api_key: str,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Tuple[str, int]:
        """
        Send chat completion request.
        Returns (response_text, tokens_used).
        """
        url = f"{base_url.rstrip('/')}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        
        content = data["choices"][0]["message"]["content"]
        tokens = data.get("usage", {}).get("total_tokens", 0)
        
        return content, tokens


# ==================== CHAT SERVICE ====================

class ChatService:
    """Main chat service orchestrating conversations."""

    @staticmethod
    async def is_enabled(db: AsyncSession) -> bool:
        return await SettingsService.get_typed(db, "assistant_enabled") or False

    @staticmethod
    async def check_rate_limit(
        db: AsyncSession,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Check if rate limit exceeded for a user/session.
        Returns (is_exceeded, message).
        """
        per_minute = await SettingsService.get_typed(db, "rate_limit_per_minute") or 0
        per_hour = await SettingsService.get_typed(db, "rate_limit_per_hour") or 0

        if not per_minute and not per_hour:
            return False, ""

        now = datetime.now(timezone.utc)

        # Build subquery for user's conversations
        if user_id:
            conv_ids_subq = select(AIConversation.id).where(AIConversation.user_id == user_id)
        elif session_id:
            conv_ids_subq = select(AIConversation.id).where(AIConversation.session_id == session_id)
        else:
            return False, ""

        base_filter = [
            AIMessage.role == AIMessageRole.USER,
            AIMessage.conversation_id.in_(conv_ids_subq),
        ]

        limit_msg = await SettingsService.get(db, "rate_limit_message") or "Слишком много сообщений. Подождите."

        if per_minute:
            since_minute = now - timedelta(minutes=1)
            count = await db.scalar(
                select(func.count(AIMessage.id)).where(
                    *base_filter,
                    AIMessage.created_at >= since_minute,
                )
            )
            if count and count >= per_minute:
                logger.info(f"Rate limit (per minute) hit: user_id={user_id}, session={session_id}, count={count}/{per_minute}")
                return True, limit_msg

        if per_hour:
            since_hour = now - timedelta(hours=1)
            count = await db.scalar(
                select(func.count(AIMessage.id)).where(
                    *base_filter,
                    AIMessage.created_at >= since_hour,
                )
            )
            if count and count >= per_hour:
                logger.info(f"Rate limit (per hour) hit: user_id={user_id}, session={session_id}, count={count}/{per_hour}")
                return True, limit_msg

        return False, ""

    @staticmethod
    async def check_manager_keywords(db: AsyncSession, text: str) -> bool:
        """Check if user message contains manager-request keywords."""
        keywords = await SettingsService.get_typed(db, "manager_keywords")
        if not keywords:
            return False
        text_lower = text.lower()
        for keyword in keywords:
            if keyword.lower() in text_lower:
                return True
        return False

    @staticmethod
    async def get_or_create_conversation(
        db: AsyncSession,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        conversation_id: Optional[int] = None,
    ) -> AIConversation:
        """Get existing or create new conversation."""
        if conversation_id:
            conv = await db.get(AIConversation, conversation_id)
            if conv:
                return conv
        
        conv = AIConversation(
            user_id=user_id,
            session_id=session_id,
            status=AIConversationStatus.ACTIVE,
        )
        db.add(conv)
        await db.flush()
        return conv

    @staticmethod
    async def send_message(
        db: AsyncSession,
        conversation_id: int,
        content: str,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
    ) -> Tuple[AIMessage, Optional[AIMessage]]:
        """
        Process user message and generate AI response.
        Returns (user_message, ai_response_or_none).
        """
        conv = await db.get(AIConversation, conversation_id)
        if not conv:
            raise ValueError("Conversation not found")
        
        # Check if conversation is in manager mode
        if conv.status == AIConversationStatus.MANAGER_CONNECTED:
            # Just save user message, no AI response
            user_msg = AIMessage(
                conversation_id=conversation_id,
                role=AIMessageRole.USER,
                content=content,
            )
            db.add(user_msg)
            conv.message_count += 1
            conv.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user_msg)
            return user_msg, None
        
        # Content filtering
        is_blocked, filtered_content = await ContentFilter.check_input(db, content)
        if is_blocked:
            user_msg = AIMessage(
                conversation_id=conversation_id,
                role=AIMessageRole.USER,
                content="[Сообщение заблокировано фильтром]",
                was_filtered=True,
                original_content=content,
            )
            db.add(user_msg)
            
            system_msg = AIMessage(
                conversation_id=conversation_id,
                role=AIMessageRole.ASSISTANT,
                content="Извините, ваше сообщение содержит недопустимые слова. Пожалуйста, перефразируйте вопрос.",
            )
            db.add(system_msg)
            conv.message_count += 2
            conv.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(user_msg)
            await db.refresh(system_msg)
            return user_msg, system_msg
        
        # Save user message
        user_msg = AIMessage(
            conversation_id=conversation_id,
            role=AIMessageRole.USER,
            content=filtered_content,
            was_filtered=(filtered_content != content),
            original_content=(content if filtered_content != content else None),
        )
        db.add(user_msg)
        await db.flush()
        
        # Check for manager keywords
        if await ChatService.check_manager_keywords(db, content):
            conv.status = AIConversationStatus.MANAGER_REQUESTED
            
            system_msg = AIMessage(
                conversation_id=conversation_id,
                role=AIMessageRole.ASSISTANT,
                content="Понял, сейчас свяжу вас с менеджером. Пожалуйста, подождите немного, менеджер скоро ответит. ☕",
            )
            db.add(system_msg)
            conv.message_count += 2
            conv.updated_at = datetime.now(timezone.utc)
            
            # Set title if first message
            if not conv.title:
                conv.title = content[:100]
            
            await db.commit()
            await db.refresh(user_msg)
            await db.refresh(system_msg)
            return user_msg, system_msg
        
        # Get settings
        base_url = await SettingsService.get(db, "openai_base_url")
        api_key = await SettingsService.get(db, "openai_api_key")
        model = await SettingsService.get(db, "openai_model")
        temperature = await SettingsService.get_typed(db, "temperature") or 0.7
        max_tokens = await SettingsService.get_typed(db, "max_tokens") or 1024
        context_limit = await SettingsService.get_typed(db, "context_messages_limit") or 20
        system_prompt = await SettingsService.get(db, "system_prompt")
        
        # Build messages for API
        api_messages = []
        
        # System prompt
        if system_prompt:
            api_messages.append({"role": "system", "content": system_prompt})
        
        # RAG context
        rag_docs = await RAGService.search(db, content)
        rag_context = RAGService.format_context(rag_docs)
        if rag_context:
            api_messages.append({"role": "system", "content": rag_context})
            logger.info(f"RAG: found {len(rag_docs)} docs for query '{content[:60]}': {[d.title for d in rag_docs]}")
        else:
            logger.info(f"RAG: no relevant docs found for query '{content[:60]}'")
        
        # Conversation history
        history_result = await db.execute(
            select(AIMessage)
            .where(
                AIMessage.conversation_id == conversation_id,
                AIMessage.role.in_([AIMessageRole.USER, AIMessageRole.ASSISTANT]),
            )
            .order_by(AIMessage.created_at.desc())
            .limit(context_limit)
        )
        history = list(reversed(list(history_result.scalars().all())))
        
        for msg in history:
            role = "user" if msg.role == AIMessageRole.USER else "assistant"
            api_messages.append({"role": role, "content": msg.content})
        
        # Generate AI response
        start_time = time.time()
        try:
            response_text, tokens_used = await OpenAIClient.chat_completion(
                messages=api_messages,
                base_url=base_url,
                api_key=api_key,
                model=model or "gpt-4o-mini",
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            response_text = "Извините, произошла ошибка при обработке запроса. Попробуйте позже или обратитесь к менеджеру."
            tokens_used = 0
        
        response_time = int((time.time() - start_time) * 1000)
        
        # Filter output
        was_filtered, filtered_response, original_response = await ContentFilter.filter_output(db, response_text)
        
        # Save AI response
        ai_msg = AIMessage(
            conversation_id=conversation_id,
            role=AIMessageRole.ASSISTANT,
            content=filtered_response,
            tokens_used=tokens_used,
            response_time_ms=response_time,
            model_used=model,
            was_filtered=was_filtered,
            original_content=original_response,
        )
        db.add(ai_msg)
        
        # Update conversation
        conv.message_count += 2
        conv.total_tokens_used += tokens_used
        conv.updated_at = datetime.now(timezone.utc)
        if not conv.title:
            conv.title = content[:100]
        
        await db.commit()
        await db.refresh(user_msg)
        await db.refresh(ai_msg)
        
        return user_msg, ai_msg

    @staticmethod
    async def get_conversations(
        db: AsyncSession,
        status: Optional[str] = None,
        user_id: Optional[int] = None,
        search: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[list[AIConversation], int]:
        """Get conversations list with filtering."""
        q = select(AIConversation)
        count_q = select(func.count(AIConversation.id))
        
        filters = []
        if status:
            try:
                status_enum = AIConversationStatus(status)
                filters.append(AIConversation.status == status_enum)
            except ValueError:
                pass  # invalid status value, skip filter
        if user_id:
            filters.append(AIConversation.user_id == user_id)
        if date_from:
            filters.append(AIConversation.created_at >= date_from)
        if date_to:
            filters.append(AIConversation.created_at <= date_to)
        if search:
            # Search in title, session_id, and linked user name/email
            from backend.models.user import User as UserModel
            user_ids_subq = select(UserModel.id).where(
                or_(
                    UserModel.username.ilike(f"%{search}%"),
                    UserModel.email.ilike(f"%{search}%"),
                )
            )
            filters.append(or_(
                AIConversation.title.ilike(f"%{search}%"),
                AIConversation.session_id.ilike(f"%{search}%"),
                AIConversation.user_id.in_(user_ids_subq),
            ))
        
        if filters:
            q = q.where(and_(*filters))
            count_q = count_q.where(and_(*filters))
        
        total = await db.scalar(count_q) or 0
        
        result = await db.execute(
            q.order_by(desc(AIConversation.updated_at)).offset(skip).limit(limit)
        )
        conversations = list(result.scalars().all())
        
        return conversations, total

    @staticmethod
    async def get_stats(db: AsyncSession) -> AssistantStats:
        """Get assistant usage statistics."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        total_convs = await db.scalar(select(func.count(AIConversation.id))) or 0
        active_convs = await db.scalar(
            select(func.count(AIConversation.id))
            .where(AIConversation.status == AIConversationStatus.ACTIVE)
        ) or 0
        
        # Total escalations: conversations that ever had manager involvement
        manager_escalations = await db.scalar(
            select(func.count(AIConversation.id))
            .where(or_(
                AIConversation.manager_id.isnot(None),
                AIConversation.status.in_([
                    AIConversationStatus.MANAGER_REQUESTED,
                    AIConversationStatus.MANAGER_CONNECTED,
                ]),
            ))
        ) or 0
        
        closed_convs = await db.scalar(
            select(func.count(AIConversation.id))
            .where(AIConversation.status == AIConversationStatus.CLOSED)
        ) or 0
        
        total_messages = await db.scalar(select(func.count(AIMessage.id))) or 0
        
        filtered_messages = await db.scalar(
            select(func.count(AIMessage.id))
            .where(AIMessage.was_filtered == True)
        ) or 0
        
        avg_response = await db.scalar(
            select(func.avg(AIMessage.response_time_ms))
            .where(AIMessage.response_time_ms.isnot(None))
        )
        
        total_tokens = await db.scalar(
            select(func.sum(AIConversation.total_tokens_used))
        ) or 0
        
        convs_today = await db.scalar(
            select(func.count(AIConversation.id))
            .where(AIConversation.created_at >= today_start)
        ) or 0
        
        msgs_today = await db.scalar(
            select(func.count(AIMessage.id))
            .where(AIMessage.created_at >= today_start)
        ) or 0
        
        # Escalations today
        escalations_today = await db.scalar(
            select(func.count(AIConversation.id))
            .where(
                AIConversation.updated_at >= today_start,
                or_(
                    AIConversation.manager_id.isnot(None),
                    AIConversation.status.in_([
                        AIConversationStatus.MANAGER_REQUESTED,
                        AIConversationStatus.MANAGER_CONNECTED,
                    ]),
                ),
            )
        ) or 0
        
        unique_users = await db.scalar(
            select(func.count(func.distinct(AIConversation.user_id)))
            .where(AIConversation.user_id.isnot(None))
        ) or 0
        
        return AssistantStats(
            total_conversations=total_convs,
            active_conversations=active_convs,
            manager_escalations=manager_escalations,
            closed_conversations=closed_convs,
            total_messages=total_messages,
            filtered_messages=filtered_messages,
            avg_response_time_ms=round(avg_response, 1) if avg_response else None,
            total_tokens_used=total_tokens,
            conversations_today=convs_today,
            messages_today=msgs_today,
            escalations_today=escalations_today,
            unique_users=unique_users,
        )


# ==================== TELEGRAM SERVICE ====================

class TelegramService:
    """Send notifications via Telegram bot to all linked admins."""

    @staticmethod
    async def _send_message(
        bot_token: str, chat_id: str, text: str,
        parse_mode: str = "HTML", reply_markup: dict = None,
    ) -> Optional[int]:
        """
        Send a message via Telegram Bot API.
        Returns the sent message_id on success, None on failure.
        """
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
        }
        if reply_markup:
            payload["reply_markup"] = json.dumps(reply_markup)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    msg_id = data.get("result", {}).get("message_id")
                    logger.info(f"[TG] Message sent to chat {chat_id}, msg_id={msg_id}")
                    return msg_id
                else:
                    logger.warning(f"[TG] Failed to send: {response.status_code} {response.text}")
                    return None
        except Exception as e:
            logger.error(f"[TG] Error sending message: {e}")
            return None

    @staticmethod
    async def _get_active_links(db: AsyncSession, notification_type: str) -> list[AITelegramLink]:
        """Get all active telegram links that want a specific notification type."""
        q = select(AITelegramLink).where(
            AITelegramLink.is_active == True,
        )
        if notification_type == "new_conversation":
            q = q.where(AITelegramLink.notify_new_conversation == True)
        elif notification_type == "manager_request":
            q = q.where(AITelegramLink.notify_manager_request == True)
        elif notification_type == "new_message":
            q = q.where(AITelegramLink.notify_new_message == True)
        result = await db.execute(q)
        return list(result.scalars().all())

    @staticmethod
    async def notify_new_conversation(db: AsyncSession, conv_id: int, user_name: str, first_message: str):
        """Notify all subscribed admins about a new conversation."""
        enabled = await SettingsService.get_typed(db, "telegram_enabled")
        if not enabled:
            return
        bot_token = await SettingsService.get(db, "telegram_bot_token")
        if not bot_token:
            return
        links = await TelegramService._get_active_links(db, "new_conversation")
        if not links:
            return

        text = (
            f"🆕 <b>Новый диалог #{conv_id}</b>\n"
            f"👤 {_escape_html(user_name)}\n"
            f"💬 {_escape_html(first_message[:200])}\n\n"
            f"<i>Ответьте на это сообщение, чтобы написать клиенту.</i>"
        )
        for link in links:
            await TelegramService._send_message(bot_token, link.telegram_chat_id, text)

    @staticmethod
    async def notify_manager_request(db: AsyncSession, conv_id: int, user_name: str, message: str):
        """Notify all subscribed admins about a manager escalation request, including full history."""
        enabled = await SettingsService.get_typed(db, "telegram_enabled")
        if not enabled:
            return
        bot_token = await SettingsService.get(db, "telegram_bot_token")
        if not bot_token:
            return
        links = await TelegramService._get_active_links(db, "manager_request")
        if not links:
            return

        # Main alert (used as the reply target for manager responses)
        alert_text = (
            f"🚨 <b>Запрос менеджера! Диалог #{conv_id}</b>\n"
            f"👤 {_escape_html(user_name)}\n"
            f"💬 {_escape_html(message[:200])}\n\n"
            f"<i>Ответьте на это сообщение, чтобы подключиться к чату.</i>"
        )

        # Build conversation history text
        result = await db.execute(
            select(AIMessage)
            .where(AIMessage.conversation_id == conv_id)
            .order_by(AIMessage.created_at)  # chronological (oldest → newest)
        )
        all_messages = list(result.scalars().all())
        # Exclude the very last system/assistant message if it triggered escalation
        history_msgs = [m for m in all_messages if m.role in (
            AIMessageRole.USER, AIMessageRole.ASSISTANT, AIMessageRole.MANAGER
        )]

        role_icons = {
            AIMessageRole.USER: "👤",
            AIMessageRole.ASSISTANT: "🤖",
            AIMessageRole.MANAGER: "👨‍💼",
        }
        history_lines = [f"📜 <b>Переписка диалога #{conv_id}:</b>\n"]
        for m in history_msgs:
            icon = role_icons.get(m.role, "💬")
            time_str = m.created_at.strftime("%H:%M") if m.created_at else ""
            content = _escape_html(m.content[:300])
            if len(m.content) > 300:
                content += "…"
            history_lines.append(f"{icon} <i>{time_str}</i>  {content}")

        history_text = "\n".join(history_lines) if len(history_msgs) > 0 else None

        for link in links:
            await TelegramService._send_message(bot_token, link.telegram_chat_id, alert_text)
            if history_text:
                await TelegramService._send_message(bot_token, link.telegram_chat_id, history_text)

    @staticmethod
    async def notify_new_message(db: AsyncSession, conv_id: int, user_name: str, message: str):
        """Notify subscribed admins about a new user message."""
        enabled = await SettingsService.get_typed(db, "telegram_enabled")
        if not enabled:
            return
        bot_token = await SettingsService.get(db, "telegram_bot_token")
        if not bot_token:
            return

        # Check if conversation has an assigned manager — if so, only notify that manager
        conv = await db.get(AIConversation, conv_id)
        if conv and conv.manager_id:
            manager_link = await db.scalar(
                select(AITelegramLink).where(
                    AITelegramLink.admin_user_id == conv.manager_id,
                    AITelegramLink.is_active == True,
                )
            )
            if manager_link:
                text = (
                    f"💬 <b>Сообщение в диалоге #{conv_id}</b>\n"
                    f"👤 {_escape_html(user_name)}\n"
                    f"📝 {_escape_html(message[:300])}\n\n"
                    f"<i>Ответьте на это сообщение, чтобы ответить клиенту.</i>"
                )
                await TelegramService._send_message(bot_token, manager_link.telegram_chat_id, text)
                return

        # No assigned manager — notify all subscribers
        links = await TelegramService._get_active_links(db, "new_message")
        if not links:
            return

        text = (
            f"💬 <b>Сообщение в диалоге #{conv_id}</b>\n"
            f"👤 {_escape_html(user_name)}\n"
            f"📝 {_escape_html(message[:300])}\n\n"
            f"<i>Ответьте на это сообщение, чтобы ответить клиенту.</i>"
        )
        for link in links:
            await TelegramService._send_message(bot_token, link.telegram_chat_id, text)

    @staticmethod
    async def notify_manager_reply_to_user(db: AsyncSession, conv_id: int, user_name: str, reply_text: str):
        """Notify all subscribers that a manager replied in a conversation (for visibility)."""
        # This is informational — skip for now, only the user sees it in chat
        pass

    @staticmethod
    async def test_connection(bot_token: str, chat_id: str) -> tuple[bool, str]:
        """Test Telegram bot connection by sending a test message."""
        text = "✅ <b>LocalTea AI Assistant</b>\nТестовое уведомление — подключение успешно!"
        msg_id = await TelegramService._send_message(bot_token, chat_id, text)
        if msg_id:
            return True, "Тестовое сообщение отправлено"
        return False, "Не удалось отправить сообщение. Проверьте токен и chat_id."

    @staticmethod
    async def test_link(db: AsyncSession, link_id: int) -> tuple[bool, str]:
        """Test a specific telegram link."""
        link = await db.get(AITelegramLink, link_id)
        if not link:
            return False, "Привязка не найдена"
        bot_token = await SettingsService.get(db, "telegram_bot_token")
        if not bot_token:
            return False, "Токен бота не настроен"
        
        # Get admin info
        from backend.models.user import User
        admin = await db.get(User, link.admin_user_id)
        admin_name = (admin.username if admin else "?")
        
        text = (
            f"✅ <b>Тест подключения</b>\n"
            f"Привязка к аккаунту: {_escape_html(admin_name)}\n"
            f"Уведомления работают!"
        )
        msg_id = await TelegramService._send_message(bot_token, link.telegram_chat_id, text)
        if msg_id:
            return True, "Тестовое сообщение отправлено"
        return False, "Не удалось отправить. Проверьте chat_id."


# ==================== TELEGRAM BOT POLLER ====================

def _escape_html(text: str) -> str:
    """Escape HTML special characters for Telegram."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class TelegramBotPoller:
    """
    Long-polling Telegram bot that processes incoming messages.
    Supports commands for managing conversations directly from Telegram:
    - Reply to notification → forward as manager message
    - /chats → list active conversations with action hints
    - /h<N> → view conversation history
    - /ai<N> → switch conversation to AI mode
    - /close<N> → close conversation
    - /help → full command reference
    """

    # Pattern: /cmd or /cmd_N or /cmdN  (e.g. /h42, /h_42, /close_42, /close42)
    _CMD_RE = re.compile(r"^/([a-z]+)[_]?(\d+)?$", re.IGNORECASE)

    def __init__(self):
        self._running = False
        self._offset = 0
        self._task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the polling loop as a background task."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("[TG BOT] Polling started")

    async def stop(self):
        """Stop the polling loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("[TG BOT] Polling stopped")

    async def _poll_loop(self):
        """Main polling loop."""
        while self._running:
            try:
                await self._poll_once()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[TG BOT] Poll error: {e}")
                await asyncio.sleep(5)

    async def _poll_once(self):
        """One iteration of polling."""
        from backend.db.session import AsyncSessionLocal as async_session_factory
        
        # Get bot token from DB
        async with async_session_factory() as db:
            enabled = await SettingsService.get_typed(db, "telegram_enabled")
            if not enabled:
                await asyncio.sleep(10)
                return
            bot_token = await SettingsService.get(db, "telegram_bot_token")
            if not bot_token:
                await asyncio.sleep(10)
                return

        # Long poll for updates
        url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
        params = {
            "offset": self._offset,
            "timeout": 30,
            "allowed_updates": json.dumps(["message"]),
        }
        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                response = await client.get(url, params=params)
                if response.status_code != 200:
                    logger.warning(f"[TG BOT] getUpdates failed: {response.status_code}")
                    await asyncio.sleep(5)
                    return
                data = response.json()
        except httpx.ReadTimeout:
            return  # Normal for long polling
        except Exception as e:
            logger.error(f"[TG BOT] getUpdates error: {e}")
            await asyncio.sleep(5)
            return

        updates = data.get("result", [])
        if not updates:
            return

        for update in updates:
            self._offset = update["update_id"] + 1
            await self._handle_update(update, bot_token)

    # ---------- UPDATE ROUTING ----------

    async def _handle_update(self, update: dict, bot_token: str):
        """Handle a single Telegram update."""
        message = update.get("message")
        if not message:
            return

        chat_id = str(message.get("chat", {}).get("id", ""))
        text = (message.get("text") or "").strip()
        reply_to = message.get("reply_to_message")

        if not chat_id or not text:
            return

        # Handle commands
        if text.startswith("/"):
            await self._route_command(text, chat_id, bot_token)
            return

        # Handle reply to a notification — forward as manager message
        if reply_to:
            await self._handle_reply(reply_to, text, chat_id, bot_token)
            return

        # Plain message (not a reply) — show quick guide
        await TelegramService._send_message(
            bot_token, chat_id,
            "💬 Чтобы ответить клиенту — нажмите <b>Reply</b> на уведомление.\n\n"
            "Или используйте команды:\n"
            "/chats — список диалогов\n"
            "/help — все команды",
        )

    # ---------- COMMAND ROUTING ----------

    async def _route_command(self, text: str, chat_id: str, bot_token: str):
        """Parse and route bot commands."""
        # Normalize: strip @botname suffix, take first word
        raw_cmd = text.split()[0].split("@")[0].lower()
        
        m = self._CMD_RE.match(raw_cmd)
        if not m:
            await TelegramService._send_message(
                bot_token, chat_id,
                "❓ Неизвестная команда. Введите /help",
            )
            return

        cmd_name = m.group(1)   # e.g. "h", "ai", "close", "chats"
        cmd_id = int(m.group(2)) if m.group(2) else None  # e.g. 42

        # Commands that don't need conv_id
        if cmd_name == "start":
            await self._cmd_start(chat_id, bot_token)
        elif cmd_name == "chats":
            await self._cmd_chats(chat_id, bot_token)
        elif cmd_name in ("help", "?"):
            await self._cmd_help(chat_id, bot_token)
        # Commands requiring conv_id
        elif cmd_name in ("h", "history"):
            if not cmd_id:
                await TelegramService._send_message(bot_token, chat_id,
                    "📜 Укажите номер диалога: <code>/h42</code>")
                return
            await self._cmd_history(chat_id, cmd_id, bot_token)
        elif cmd_name == "ai":
            if not cmd_id:
                await TelegramService._send_message(bot_token, chat_id,
                    "🤖 Укажите номер диалога: <code>/ai42</code>")
                return
            await self._cmd_switch_ai(chat_id, cmd_id, bot_token)
        elif cmd_name == "close":
            if not cmd_id:
                await TelegramService._send_message(bot_token, chat_id,
                    "🔒 Укажите номер диалога: <code>/close42</code>")
                return
            await self._cmd_close(chat_id, cmd_id, bot_token)
        else:
            await TelegramService._send_message(
                bot_token, chat_id,
                "❓ Неизвестная команда. Введите /help",
            )

    # ---------- /start ----------

    async def _cmd_start(self, chat_id: str, bot_token: str):
        await TelegramService._send_message(
            bot_token, chat_id,
            "👋 <b>LocalTea — Telegram-менеджер</b>\n\n"
            f"Ваш Chat ID: <code>{chat_id}</code>\n\n"
            "Добавьте этот Chat ID в админ-панели → Настройки → Telegram, "
            "чтобы получать уведомления.\n\n"
            "Введите /help для списка команд.",
        )

    # ---------- /help ----------

    async def _cmd_help(self, chat_id: str, bot_token: str):
        await TelegramService._send_message(
            bot_token, chat_id,
            "📖 <b>Команды бота</b>\n\n"
            "<b>Основные:</b>\n"
            "/chats — список активных диалогов\n"
            "/start — показать Chat ID\n\n"
            "<b>Управление диалогом</b> (N — номер):\n"
            "/h<i>N</i> — история сообщений\n"
            "/ai<i>N</i> — переключить на ИИ-режим\n"
            "/close<i>N</i> — закрыть диалог\n\n"
            "<b>Ответ клиенту:</b>\n"
            "Нажмите <b>Reply</b> на любое уведомление и напишите текст — "
            "он будет доставлен клиенту от имени менеджера.\n\n"
            "<i>Пример: /h42 — показать историю диалога #42</i>",
        )

    # ---------- /chats ----------

    async def _cmd_chats(self, chat_id: str, bot_token: str):
        """Show active conversations with inline action hints."""
        from backend.db.session import AsyncSessionLocal as async_session_factory
        
        async with async_session_factory() as db:
            link = await self._get_verified_link(db, chat_id, bot_token)
            if not link:
                return

            # Get active conversations
            result = await db.execute(
                select(AIConversation)
                .where(AIConversation.status.in_([
                    AIConversationStatus.ACTIVE,
                    AIConversationStatus.MANAGER_REQUESTED,
                    AIConversationStatus.MANAGER_CONNECTED,
                ]))
                .order_by(desc(AIConversation.updated_at))
                .limit(15)
            )
            convs = list(result.scalars().all())

            if not convs:
                await TelegramService._send_message(
                    bot_token, chat_id,
                    "📭 Нет активных диалогов.",
                )
                return

            lines = ["📋 <b>Активные диалоги</b>\n"]
            status_map = {
                AIConversationStatus.ACTIVE: ("🤖", "ИИ"),
                AIConversationStatus.MANAGER_REQUESTED: ("🚨", "Ждёт менеджера"),
                AIConversationStatus.MANAGER_CONNECTED: ("👨‍💼", "Менеджер"),
            }
            for c in convs:
                emoji, status_label = status_map.get(c.status, ("❓", "?"))
                
                user_name = "Гость"
                if c.user_id:
                    from backend.models.user import User
                    u = await db.get(User, c.user_id)
                    if u:
                        user_name = u.username or u.email or "Пользователь"
                
                title = (c.title[:35] if c.title else "Без темы")
                lines.append(
                    f"{emoji} <b>#{c.id}</b> {_escape_html(user_name)}\n"
                    f"    {_escape_html(title)} · <i>{status_label}</i>\n"
                    f"    /h{c.id}  /ai{c.id}  /close{c.id}"
                )

            lines.append("\n💡 Нажмите на команду для быстрого действия")
            await TelegramService._send_message(bot_token, chat_id, "\n".join(lines))

    # ---------- /h<N> — conversation history ----------

    async def _cmd_history(self, chat_id: str, conv_id: int, bot_token: str):
        """Show last messages of a conversation."""
        from backend.db.session import AsyncSessionLocal as async_session_factory
        
        async with async_session_factory() as db:
            link = await self._get_verified_link(db, chat_id, bot_token)
            if not link:
                return

            conv = await db.get(AIConversation, conv_id)
            if not conv:
                await TelegramService._send_message(bot_token, chat_id,
                    f"⚠️ Диалог #{conv_id} не найден.")
                return

            # Get all messages in chronological order, take last 20
            result = await db.execute(
                select(AIMessage)
                .where(AIMessage.conversation_id == conv_id)
                .order_by(AIMessage.created_at)  # ascending = oldest → newest
            )
            all_msgs = list(result.scalars().all())
            messages = all_msgs[-20:]  # last 20 in chronological order

            if not messages:
                await TelegramService._send_message(bot_token, chat_id,
                    f"📜 Диалог #{conv_id} пуст.")
                return

            # Get conversation info
            user_name = "Гость"
            if conv.user_id:
                from backend.models.user import User
                u = await db.get(User, conv.user_id)
                if u:
                    user_name = u.username or u.email or "Пользователь"

            status_labels = {
                AIConversationStatus.ACTIVE: "🤖 ИИ",
                AIConversationStatus.MANAGER_REQUESTED: "🚨 Ждёт менеджера",
                AIConversationStatus.MANAGER_CONNECTED: "👨‍💼 Менеджер",
                AIConversationStatus.CLOSED: "🔒 Закрыт",
            }
            status_text = status_labels.get(conv.status, "❓")

            shown = len(messages)
            total = conv.message_count or len(all_msgs)
            history_note = f"последние {shown}" if shown < total else f"все {shown}"
            lines = [
                f"📜 <b>Диалог #{conv_id}</b> · {status_text}",
                f"👤 {_escape_html(user_name)} · 💬 {history_note} сообщ.\n",
            ]

            role_icons = {
                AIMessageRole.USER: "👤",
                AIMessageRole.ASSISTANT: "🤖",
                AIMessageRole.MANAGER: "👨‍💼",
                AIMessageRole.SYSTEM: "⚙️",
            }

            for msg in messages:
                icon = role_icons.get(msg.role, "💬")
                time_str = msg.created_at.strftime("%H:%M") if msg.created_at else ""
                content = msg.content[:200]
                if len(msg.content) > 200:
                    content += "…"
                lines.append(f"{icon} <i>{time_str}</i> {_escape_html(content)}")

            # Action hints based on status
            lines.append("")
            if conv.status != AIConversationStatus.CLOSED:
                actions = []
                if conv.status == AIConversationStatus.MANAGER_CONNECTED:
                    actions.append(f"/ai{conv_id} — вернуть ИИ")
                actions.append(f"/close{conv_id} — закрыть")
                lines.append("⚡ " + " | ".join(actions))
            else:
                lines.append("🔒 Диалог закрыт")

            await TelegramService._send_message(bot_token, chat_id, "\n".join(lines))

    # ---------- /ai<N> — switch to AI mode ----------

    async def _cmd_switch_ai(self, chat_id: str, conv_id: int, bot_token: str):
        """Switch a conversation back to AI mode."""
        from backend.db.session import AsyncSessionLocal as async_session_factory
        
        async with async_session_factory() as db:
            link = await self._get_verified_link(db, chat_id, bot_token)
            if not link:
                return

            conv = await db.get(AIConversation, conv_id)
            if not conv:
                await TelegramService._send_message(bot_token, chat_id,
                    f"⚠️ Диалог #{conv_id} не найден.")
                return

            if conv.status == AIConversationStatus.CLOSED:
                await TelegramService._send_message(bot_token, chat_id,
                    f"🔒 Диалог #{conv_id} уже закрыт.")
                return

            if conv.status == AIConversationStatus.ACTIVE:
                await TelegramService._send_message(bot_token, chat_id,
                    f"🤖 Диалог #{conv_id} уже в режиме ИИ.")
                return

            # Switch to AI
            conv.status = AIConversationStatus.ACTIVE
            conv.manager_id = None
            conv.updated_at = datetime.now(timezone.utc)

            system_msg = AIMessage(
                conversation_id=conv_id,
                role=AIMessageRole.SYSTEM,
                content="Менеджер передал диалог ИИ-ассистенту.",
            )
            db.add(system_msg)
            conv.message_count += 1
            await db.commit()

            await TelegramService._send_message(bot_token, chat_id,
                f"🤖 Диалог #{conv_id} переключён на ИИ-ассистента.\n"
                f"Клиент теперь общается с ИИ.")

    # ---------- /close<N> — close conversation ----------

    async def _cmd_close(self, chat_id: str, conv_id: int, bot_token: str):
        """Close a conversation and send configurable close message to user."""
        from backend.db.session import AsyncSessionLocal as async_session_factory
        
        async with async_session_factory() as db:
            link = await self._get_verified_link(db, chat_id, bot_token)
            if not link:
                return

            conv = await db.get(AIConversation, conv_id)
            if not conv:
                await TelegramService._send_message(bot_token, chat_id,
                    f"⚠️ Диалог #{conv_id} не найден.")
                return

            if conv.status == AIConversationStatus.CLOSED:
                await TelegramService._send_message(bot_token, chat_id,
                    f"🔒 Диалог #{conv_id} уже закрыт.")
                return

            # Get configurable close message
            close_msg_text = await SettingsService.get(db, "conversation_close_message") or "Диалог завершён."

            # Add close message to conversation
            close_msg = AIMessage(
                conversation_id=conv_id,
                role=AIMessageRole.SYSTEM,
                content=close_msg_text,
            )
            db.add(close_msg)

            conv.status = AIConversationStatus.CLOSED
            conv.closed_at = datetime.utcnow()
            conv.message_count += 1
            conv.updated_at = datetime.now(timezone.utc)
            await db.commit()

            await TelegramService._send_message(bot_token, chat_id,
                f"🔒 Диалог #{conv_id} закрыт.\n"
                f"Клиенту отправлено сообщение о завершении.")

    # ---------- REPLY HANDLER ----------

    async def _handle_reply(self, reply_to: dict, text: str, chat_id: str, bot_token: str):
        """Handle reply to a notification — post as manager message."""
        from backend.db.session import AsyncSessionLocal as async_session_factory
        
        # Extract conversation ID from the replied-to message
        reply_text = reply_to.get("text", "")
        conv_id = self._extract_conv_id(reply_text)
        
        if not conv_id:
            await TelegramService._send_message(
                bot_token, chat_id,
                "⚠️ Не удалось определить диалог. Ответьте на уведомление с номером диалога.",
            )
            return

        async with async_session_factory() as db:
            link = await self._get_verified_link(db, chat_id, bot_token)
            if not link:
                return

            conv = await db.get(AIConversation, conv_id)
            if not conv:
                await TelegramService._send_message(bot_token, chat_id,
                    f"⚠️ Диалог #{conv_id} не найден.")
                return

            if conv.status == AIConversationStatus.CLOSED:
                await TelegramService._send_message(bot_token, chat_id,
                    f"🔒 Диалог #{conv_id} уже закрыт.")
                return

            # Switch to manager mode if not already
            if conv.status != AIConversationStatus.MANAGER_CONNECTED:
                conv.status = AIConversationStatus.MANAGER_CONNECTED
                conv.manager_id = link.admin_user_id
                
                system_msg = AIMessage(
                    conversation_id=conv_id,
                    role=AIMessageRole.SYSTEM,
                    content="Менеджер подключился к чату через Telegram.",
                )
                db.add(system_msg)
            elif conv.manager_id != link.admin_user_id:
                conv.manager_id = link.admin_user_id

            # Add manager message
            msg = AIMessage(
                conversation_id=conv_id,
                role=AIMessageRole.MANAGER,
                content=text,
            )
            db.add(msg)
            conv.message_count += 1
            conv.updated_at = datetime.now(timezone.utc)
            
            await db.commit()

            # Confirmation
            from backend.models.user import User
            admin = await db.get(User, link.admin_user_id)
            admin_name = admin.username if admin else "Менеджер"

            await TelegramService._send_message(
                bot_token, chat_id,
                f"✅ #{conv_id} ← {_escape_html(admin_name)}: {_escape_html(text[:80])}",
            )

    # ---------- HELPERS ----------

    async def _get_verified_link(self, db, chat_id: str, bot_token: str) -> Optional[AITelegramLink]:
        """Verify chat is linked to an admin. Returns link or sends error and returns None."""
        link = await db.scalar(
            select(AITelegramLink).where(
                AITelegramLink.telegram_chat_id == chat_id,
                AITelegramLink.is_active == True,
            )
        )
        if not link:
            await TelegramService._send_message(
                bot_token, chat_id,
                "⚠️ Ваш Telegram не привязан.\n"
                "Добавьте Chat ID <code>" + chat_id + "</code> в админ-панели → Настройки → Telegram.",
            )
        return link

    @staticmethod
    def _extract_conv_id(text: str) -> Optional[int]:
        """Extract conversation ID from notification text like 'Диалог #42' or '#42'."""
        match = re.search(r"#(\d+)", text)
        if match:
            return int(match.group(1))
        return None


# Singleton poller instance
telegram_bot_poller = TelegramBotPoller()


# Singleton-like instances
settings_service = SettingsService()
content_filter = ContentFilter()
rag_service = RAGService()
chat_service = ChatService()
openai_client = OpenAIClient()
