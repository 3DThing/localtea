"""
🍯 Honeypot Endpoints
Принимает отчёты о попытках "взлома" и отправляет в Telegram
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from datetime import datetime
import base64
import html

router = APIRouter(prefix="/honeypot", tags=["honeypot"])

# Конфигурация Telegram
TELEGRAM_BOT_TOKEN = os.getenv("HONEYPOT_TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("HONEYPOT_TELEGRAM_CHAT_ID", "")


class HoneypotReport(BaseModel):
    """Данные о попытке 'взлома'"""
    action: str  # login_attempt, hack_attempt, panel_access, final_trolled
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    path_attempted: Optional[str] = None
    username_tried: Optional[str] = None
    password_tried: Optional[str] = None
    hack_action: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_base64: Optional[str] = None
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    referrer: Optional[str] = None


def get_ip_info(ip: str) -> dict:
    """Получаем информацию об IP"""
    try:
        with httpx.Client(timeout=5) as client:
            response = client.get(f"http://ip-api.com/json/{ip}?lang=ru")
            if response.status_code == 200:
                return response.json()
    except:
        pass
    return {}


async def send_telegram_message(text: str, photo_base64: Optional[str] = None):
    """Отправляем сообщение в Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ Honeypot: Telegram credentials not configured")
        return False
    
    async with httpx.AsyncClient() as client:
        try:
            if photo_base64 and photo_base64.startswith('data:'):
                # Отправляем фото с подписью
                header, b64_data = photo_base64.split(",", 1)
                # header example: data:image/jpeg;base64
                mime = "image/jpeg"
                if header.startswith("data:"):
                    mime_part = header[5:].split(";", 1)[0].strip()
                    if mime_part:
                        mime = mime_part

                photo_bytes = base64.b64decode(b64_data)

                ext_map = {
                    "image/jpeg": "jpg",
                    "image/jpg": "jpg",
                    "image/png": "png",
                    "image/gif": "gif",
                }
                ext = ext_map.get(mime, "bin")
                filename = f"intruder.{ext}"
                
                response = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                    data={
                        "chat_id": TELEGRAM_CHAT_ID,
                        "caption": text[:1024],
                        "parse_mode": "HTML",
                    },
                    files={"photo": (filename, photo_bytes, mime)},
                    timeout=30
                )
            else:
                response = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": TELEGRAM_CHAT_ID,
                        "text": text,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": True,
                    },
                    timeout=10
                )

            if response.status_code != 200:
                # Telegram often returns 400 when HTML entities are invalid.
                print(f"❌ Honeypot Telegram HTTP {response.status_code}: {response.text}")
                return False

            return True
        except Exception as e:
            print(f"❌ Honeypot Telegram error: {e}")
            return False


async def send_location(latitude: float, longitude: float):
    """Отправляем геолокацию в Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendLocation",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "latitude": latitude,
                    "longitude": longitude,
                },
                timeout=10
            )
            return response.status_code == 200
        except:
            return False


@router.post("/report")
async def report_intrusion(report: HoneypotReport, request: Request):
    """Принимаем отчёт о попытке взлома и отправляем в Telegram"""
    
    # Получаем реальный IP
    ip = request.headers.get("x-forwarded-for", request.headers.get("x-real-ip", "unknown"))
    if "," in ip:
        ip = ip.split(",")[0].strip()
    
    # Не репортим localhost/internal
    if ip in ("127.0.0.1", "localhost", "unknown", "::1"):
        return {"status": "ok", "message": "Internal request ignored"}
    
    # Информация об IP
    ip_info = get_ip_info(ip)

    if report.action == "final_trolled":
        try:
            photo_len = len(report.photo_base64) if report.photo_base64 else 0
        except Exception:
            photo_len = 0
        print(f"🍯 Honeypot final_trolled received: photo_len={photo_len}")
    
    # Формируем сообщение
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Эмодзи в зависимости от action
    emoji_map = {
        "page_view": "👁️",
        "login_attempt": "🔐",
        "panel_access": "🎛️",
        "hack_attempt": "💀",
        "final_trolled": "🤡",
    }
    emoji = emoji_map.get(report.action, "🍯")
    
    def esc(value: Optional[object]) -> str:
        if value is None:
            return "N/A"
        return html.escape(str(value), quote=False)

    message = f"""
{emoji} <b>HONEYPOT ALERT</b> {emoji}

⏰ <b>Время:</b> {timestamp}
🎯 <b>Действие:</b> {report.action}

<b>📍 Информация:</b>
• IP: <code>{esc(ip)}</code>
• Страна: {esc(ip_info.get('country'))}
• Город: {esc(ip_info.get('city'))}
• ISP: {esc(ip_info.get('isp'))}
"""

    if report.path_attempted:
        message += f"• Путь: <code>{esc(report.path_attempted)}</code>\n"
    
    if report.username_tried or report.password_tried:
        message += f"""
🔑 <b>Логин/пароль:</b>
• Login: <code>{esc(report.username_tried)}</code>
• Pass: <code>{esc(report.password_tried)}</code>
"""

    if report.hack_action:
        message += f"\n💣 <b>Атака:</b> {esc(report.hack_action)}"

    if report.action == "final_trolled":
        message += "\n\n🤡 <b>ЗАТРОЛЛЕН!</b>"

    # Отправляем в Telegram
    await send_telegram_message(message, report.photo_base64)
    
    # Отправляем геолокацию отдельно
    if report.latitude and report.longitude:
        await send_location(report.latitude, report.longitude)
    
    return {"status": "ok", "message": "Our goblin is watching 👀"}
