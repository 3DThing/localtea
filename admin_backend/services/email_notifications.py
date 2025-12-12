"""
Email notification service for admin backend.
Sends notifications about order status changes and other events.
"""
import logging
from typing import Optional
from backend.core.config import settings
from backend.models.order import Order, OrderStatus
from backend.utils.email import send_email_sync

logger = logging.getLogger(__name__)


# Email templates for different order statuses
STATUS_MESSAGES = {
    OrderStatus.PAID: {
        "subject": "Заказ #{order_id} оплачен",
        "message": "Спасибо за оплату! Мы начали подготовку вашего заказа."
    },
    OrderStatus.PROCESSING: {
        "subject": "Заказ #{order_id} обрабатывается",
        "message": "Ваш заказ находится в обработке. Мы уведомим вас, когда он будет отправлен."
    },
    OrderStatus.SHIPPED: {
        "subject": "Заказ #{order_id} отправлен",
        "message": "Ваш заказ отправлен! Трек-номер: {tracking_number}."
    },
    OrderStatus.DELIVERED: {
        "subject": "Заказ #{order_id} доставлен",
        "message": "Ваш заказ успешно доставлен. Спасибо за покупку в LocalTea!"
    },
    OrderStatus.CANCELLED: {
        "subject": "Заказ #{order_id} отменён",
        "message": "К сожалению, ваш заказ был отменён."
    },
}


def send_order_status_notification(
    order: Order,
    new_status: OrderStatus,
    tracking_number: Optional[str] = None
) -> bool:
    """Send email notification about order status change."""
    try:
        contact_info = order.contact_info or {}
        email = contact_info.get("email")
        
        if not email:
            logger.warning(f"No email found for order {order.id}")
            return False
        
        template = STATUS_MESSAGES.get(new_status)
        if not template:
            return False
        
        subject = template["subject"].format(order_id=order.id)
        message = template["message"].format(
            order_id=order.id,
            tracking_number=tracking_number or order.tracking_number or "не указан"
        )
        
        send_email_sync(email_to=email, subject=subject, body=message)
        logger.info(f"Sent {new_status.value} notification for order {order.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send order notification: {e}")
        return False


def send_tracking_notification(order: Order, tracking_number: str) -> bool:
    """Send email with tracking number."""
    try:
        contact_info = order.contact_info or {}
        email = contact_info.get("email")
        
        if not email:
            return False
        
        subject = f"Трек-номер для заказа #{order.id}"
        body = f"Ваш заказ отправлен. Трек-номер: {tracking_number}"
        
        send_email_sync(email_to=email, subject=subject, body=body)
        logger.info(f"Sent tracking notification for order {order.id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send tracking notification: {e}")
        return False
