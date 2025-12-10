from backend.core.celery_app import celery_app
from backend.core.logger import setup_logging
from backend.utils.email import send_email_sync
import asyncio
from backend.db.session import AsyncSessionLocal
from backend.services.order import order_service
from backend.services.phone_verification import phone_verification_service

setup_logging()

@celery_app.task(acks_late=True)
def test_celery(word: str) -> str:
    return f"test task return {word}"

@celery_app.task
def send_email(email_to: str, subject: str = "", body: str = "", template_name: str = None, environment: dict = None):
    send_email_sync(email_to, subject, body, template_name, environment)

@celery_app.task
def check_expired_orders():
    async def _run():
        async with AsyncSessionLocal() as db:
            await order_service.cancel_expired_orders(db)
            
    asyncio.run(_run())


@celery_app.task(bind=True, max_retries=60, default_retry_delay=5)
def check_phone_verification_status(self, user_id: int):
    """
    Фоновая задача для проверки статуса верификации телефона.
    Проверяет каждые 5 секунд, до 60 раз (5 минут).
    """
    async def _check():
        async with AsyncSessionLocal() as db:
            result = await phone_verification_service.verify_call(db, user_id)
            return result
    
    try:
        result = asyncio.run(_check())
        
        if result.get("is_confirmed"):
            # Верификация успешна, задача завершена
            return {"status": "confirmed", "user_id": user_id}
        
        if result.get("is_expired"):
            # Время истекло
            return {"status": "expired", "user_id": user_id}
        
        if result.get("is_pending"):
            # Еще ожидаем - повторяем задачу
            raise self.retry()
            
    except Exception as exc:
        # При ошибке тоже повторяем
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        return {"status": "error", "user_id": user_id, "error": str(exc)}

