"""
🍯 Honeypot Mini-Backend
Отправляет данные о попытках "взлома" в Telegram
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from datetime import datetime
import base64

app = FastAPI(title="Honeypot Service", docs_url=None, redoc_url=None)

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localtea.ru", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Конфигурация Telegram
TELEGRAM_BOT_TOKEN = os.getenv("HONEYPOT_TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("HONEYPOT_TELEGRAM_CHAT_ID", "")


class HoneypotReport(BaseModel):
    """Данные о попытке 'взлома'"""
    action: str  # login_attempt, hack_attempt, panel_access
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    path_attempted: Optional[str] = None
    username_tried: Optional[str] = None
    password_tried: Optional[str] = None
    hack_action: Optional[str] = None  # dump_db, steal_cards, etc.
    
    # Геолокация (если разрешил)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Фото с камеры (base64)
    photo_base64: Optional[str] = None
    
    # Дополнительно
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
        print("⚠️ Telegram credentials not configured")
        return False
    
    async with httpx.AsyncClient() as client:
        try:
            if photo_base64:
                # Отправляем фото с подписью
                photo_bytes = base64.b64decode(photo_base64.split(",")[-1])
                
                response = await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto",
                    data={
                        "chat_id": TELEGRAM_CHAT_ID,
                        "caption": text[:1024],  # Лимит подписи
                        "parse_mode": "HTML",
                    },
                    files={"photo": ("intruder.jpg", photo_bytes, "image/jpeg")},
                    timeout=30
                )
            else:
                # Просто текст
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
            
            return response.status_code == 200
        except Exception as e:
            print(f"❌ Telegram send error: {e}")
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


@app.post("/api/honeypot/report")
async def report_intrusion(report: HoneypotReport, request: Request):
    """Принимаем отчёт о попытке взлома"""
    
    # Получаем реальный IP
    ip = request.headers.get("x-forwarded-for", request.headers.get("x-real-ip", "unknown"))
    if "," in ip:
        ip = ip.split(",")[0].strip()
    
    # Информация об IP
    ip_info = get_ip_info(ip) if ip != "unknown" else {}
    
    # Формируем сообщение
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Эмодзи в зависимости от action
    emoji_map = {
        "login_attempt": "🔐",
        "panel_access": "🎛️",
        "hack_attempt": "💀",
        "final_trolled": "🤡",
    }
    emoji = emoji_map.get(report.action, "🍯")
    
    message = f"""
{emoji} <b>HONEYPOT ALERT</b> {emoji}

⏰ <b>Время:</b> {timestamp}
🎯 <b>Действие:</b> {report.action}

<b>📍 Информация о нарушителе:</b>
• IP: <code>{ip}</code>
• Страна: {ip_info.get('country', 'N/A')}
• Город: {ip_info.get('city', 'N/A')}
• ISP: {ip_info.get('isp', 'N/A')}
• User-Agent: <code>{(report.user_agent or 'N/A')[:100]}</code>
"""

    if report.path_attempted:
        message += f"\n🔗 <b>Путь:</b> <code>{report.path_attempted}</code>"
    
    if report.username_tried or report.password_tried:
        message += f"""
🔑 <b>Попытка входа:</b>
• Login: <code>{report.username_tried or 'N/A'}</code>
• Password: <code>{report.password_tried or 'N/A'}</code>
"""

    if report.hack_action:
        message += f"\n💣 <b>Выбранная 'атака':</b> {report.hack_action}"

    if report.screen_resolution:
        message += f"\n📺 <b>Экран:</b> {report.screen_resolution}"
    
    if report.timezone:
        message += f"\n🌍 <b>Timezone:</b> {report.timezone}"
    
    if report.language:
        message += f"\n🗣️ <b>Язык:</b> {report.language}"

    # Добавляем тролль-подпись для финального репорта
    if report.action == "final_trolled":
        message += "\n\n🤡 <b>ЗАТРОЛЛЕН!</b> Ожидал взломать — получил гоблина."

    # Отправляем в Telegram
    await send_telegram_message(message, report.photo_base64)
    
    # Отправляем геолокацию отдельно если есть
    if report.latitude and report.longitude:
        await send_location(report.latitude, report.longitude)
    
    return {"status": "ok", "message": "Report received. Our goblin is watching you 👀"}


@app.get("/health")
async def health():
    return {"status": "alive", "service": "honeypot", "goblin_mood": "watching"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
