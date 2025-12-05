from celery import Celery
from backend.core.config import settings

celery_app = Celery("worker", broker=settings.REDIS_URL, include=['backend.worker'])

celery_app.conf.task_routes = {
    "backend.worker.test_celery": "main-queue",
}

celery_app.conf.beat_schedule = {
    "check-expired-orders-every-minute": {
        "task": "backend.worker.check_expired_orders",
        "schedule": 60.0,
    },
}

