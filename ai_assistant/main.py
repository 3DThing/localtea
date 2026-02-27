"""
AI Assistant Microservice — FastAPI application.
Runs as a separate service on port 8004.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

from ai_assistant.api.chat import router as chat_router
from ai_assistant.api.admin import router as admin_router

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_assistant")

app = FastAPI(
    title="LocalTea AI Assistant API",
    description="AI чат-ассистент для консультации по чаю",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
if os.environ.get("ENABLE_CORS", "").lower() in ("true", "1", "yes"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
        ).split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routes
app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(admin_router, prefix="/api/v1/admin/assistant", tags=["admin-assistant"])


@app.on_event("startup")
async def startup():
    """Initialize default settings and start Telegram bot on startup."""
    from backend.db.session import get_db
    async for db in get_db():
        from ai_assistant.services import SettingsService
        await SettingsService.ensure_defaults(db)
        logger.info("AI Assistant settings initialized")
        break
    
    # Start Telegram bot poller
    from ai_assistant.services import telegram_bot_poller
    await telegram_bot_poller.start()
    logger.info("Telegram bot poller started")


@app.on_event("shutdown")
async def shutdown():
    """Stop Telegram bot on shutdown."""
    from ai_assistant.services import telegram_bot_poller
    await telegram_bot_poller.stop()
    logger.info("Telegram bot poller stopped")


@app.get("/")
async def root():
    return {"message": "LocalTea AI Assistant API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai_assistant"}
