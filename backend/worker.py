from backend.core.celery_app import celery_app
from backend.core.logger import setup_logging
from backend.utils.email import send_email_sync
import asyncio
from backend.db.session import AsyncSessionLocal
from backend.services.order import order_service

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

