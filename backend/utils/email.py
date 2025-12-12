import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.core.config import settings
from jinja2 import Environment, FileSystemLoader
import os
from datetime import datetime
from typing import Optional, Dict, Any

def send_email_sync(email_to: str, subject: str = "", body: str = "", template_name: str = None, environment: dict = None):
    try:
        msg = MIMEMultipart()
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        msg["To"] = email_to
        msg["Subject"] = subject

        if template_name:
            # Assuming templates are in backend/templates
            # This file is in backend/utils/email.py, so we go up one level to backend, then to templates
            template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
            env = Environment(loader=FileSystemLoader(template_dir))
            template = env.get_template(template_name)
            
            render_context = environment or {}
            render_context.setdefault("project_name", settings.PROJECT_NAME)
            render_context.setdefault("current_year", datetime.now().year)
            render_context.setdefault("subject", subject)
            
            html_content = template.render(**render_context)
            msg.attach(MIMEText(html_content, "html"))
        else:
            msg.attach(MIMEText(body, "html"))

        # Using SMTP_SSL for port 465
        with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAILS_FROM_EMAIL, email_to, msg.as_string())
            
        print(f"Email sent to {email_to}")
    except Exception as e:
        print(f"Failed to send email to {email_to}: {e}")
        raise e

def send_test_email(email_to: str, subject: str, content: str):
    """
    Sends a simple test email with provided content.
    Useful for debugging SMTP settings.
    """
    send_email_sync(email_to=email_to, subject=subject, body=content)


def send_verification_email(email_to: str, username: str, token: str, link: str):
    """
    Отправка письма подтверждения email при регистрации.
    """
    send_email_sync(
        email_to=email_to,
        subject=f"{settings.PROJECT_NAME} — Подтверждение почты",
        template_name="verification.html",
        environment={
            "title": "Подтверждение почты",
            "username": username,
            "token": token,
            "link": link
        }
    )


def send_password_changed_email(email_to: str, username: str):
    """
    Отправка уведомления о смене пароля.
    """
    send_email_sync(
        email_to=email_to,
        subject=f"{settings.PROJECT_NAME} — Пароль изменён",
        template_name="password_changed.html",
        environment={
            "username": username,
            "changed_at": datetime.now().strftime("%d.%m.%Y в %H:%M")
        }
    )


def send_email_change_confirmation(email_to: str, username: str, new_email: str, token: str, link: str):
    """
    Отправка письма подтверждения смены email.
    Отправляется на НОВЫЙ email адрес.
    """
    send_email_sync(
        email_to=email_to,
        subject=f"{settings.PROJECT_NAME} — Подтверждение нового адреса",
        template_name="email_change.html",
        environment={
            "username": username,
            "new_email": new_email,
            "token": token,
            "link": link
        }
    )


def send_order_confirmation_email(
    email_to: str,
    customer_name: str,
    order_id: int,
    payment_id: str,
    order_date: str,
    items: list,  # [{"name": str, "variant": str, "quantity": int, "price": str}, ...]
    subtotal: str,
    discount_amount: int,
    promo_code: Optional[str],
    delivery_method: str,
    delivery_cost: int,
    total: str,
    shipping_address: Optional[str],
    order_link: str
):
    """
    Отправка письма подтверждения заказа.
    
    Args:
        email_to: Email получателя
        customer_name: Имя покупателя
        order_id: Номер заказа
        payment_id: ID платежа (YooKassa)
        order_date: Дата заказа (строка)
        items: Список товаров
        subtotal: Сумма товаров (строка с форматированием)
        discount_amount: Сумма скидки в рублях (int)
        promo_code: Применённый промокод (если есть)
        delivery_method: Способ доставки ("Самовывоз" / "Почта России")
        delivery_cost: Стоимость доставки в рублях (int)
        total: Итоговая сумма (строка с форматированием)
        shipping_address: Адрес доставки (если есть)
        order_link: Ссылка на страницу заказа
    """
    send_email_sync(
        email_to=email_to,
        subject=f"{settings.PROJECT_NAME} — Заказ #{order_id} подтверждён",
        template_name="order_confirmation.html",
        environment={
            "customer_name": customer_name,
            "order_id": order_id,
            "payment_id": payment_id,
            "order_date": order_date,
            "items": items,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "promo_code": promo_code,
            "delivery_method": delivery_method,
            "delivery_cost": delivery_cost,
            "total": total,
            "shipping_address": shipping_address,
            "order_link": order_link
        }
    )


def send_order_shipped_email(
    email_to: str,
    customer_name: str,
    order_id: int,
    tracking_number: Optional[str],
    delivery_method: str,
    shipping_address: Optional[str],
    estimated_days: str,
    order_link: str
):
    """
    Отправка уведомления об отправке заказа.
    
    Args:
        email_to: Email получателя
        customer_name: Имя покупателя
        order_id: Номер заказа
        tracking_number: Трек-номер (для Почты России)
        delivery_method: Способ доставки
        shipping_address: Адрес доставки
        estimated_days: Ожидаемый срок доставки ("5-7 дней")
        order_link: Ссылка на страницу заказа
    """
    send_email_sync(
        email_to=email_to,
        subject=f"{settings.PROJECT_NAME} — Заказ #{order_id} отправлен!",
        template_name="order_shipped.html",
        environment={
            "customer_name": customer_name,
            "order_id": order_id,
            "tracking_number": tracking_number,
            "delivery_method": delivery_method,
            "shipping_address": shipping_address,
            "estimated_days": estimated_days,
            "order_link": order_link
        }
    )
