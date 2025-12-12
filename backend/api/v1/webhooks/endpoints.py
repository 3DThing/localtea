from typing import Any, Dict
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services.order import order_service
from backend.core.config import settings
import ipaddress
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# YooKassa IP ranges (official webhook sources)
# Reference: https://yookassa.ru/developers/using-api/webhooks
YOOKASSA_IP_RANGES = [
    "185.71.76.0/27",
    "185.71.77.0/27",
    "77.75.153.0/25",
    "77.75.156.11/32",
    "77.75.156.35/32",
    "77.75.154.128/25",
    "2a02:5180::/32",
]

def is_yookassa_ip(client_ip: str) -> bool:
    """
    Check if the client IP is from YooKassa's official IP ranges.
    """
    try:
        client_addr = ipaddress.ip_address(client_ip)
        for ip_range in YOOKASSA_IP_RANGES:
            if client_addr in ipaddress.ip_network(ip_range):
                return True
        return False
    except ValueError:
        return False


@router.post("/payment/yookassa")
async def yookassa_webhook(
    request: Request,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Webhook for Yookassa payment status updates.
    """
    # IP Whitelist check - verify request comes from YooKassa
    client_ip = request.client.host if request.client else "0.0.0.0"
    
    # Check X-Forwarded-For header if behind proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP from the chain (original client)
        client_ip = forwarded_for.split(",")[0].strip()
    
    if not settings.DEBUG and not is_yookassa_ip(client_ip):
        logger.warning(f"Webhook request from unauthorized IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden: Invalid source IP")
    
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    logger.info(f"Received YooKassa webhook from {client_ip}: {event.get('event', 'unknown')}")
    await order_service.process_payment_webhook(db, event)
    
    return {"status": "ok"}
