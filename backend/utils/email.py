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
