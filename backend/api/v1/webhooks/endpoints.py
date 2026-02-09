from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services.order import order_service
from backend.core.config import settings
import ipaddress
import hmac
import hashlib
import logging
from pydantic import BaseModel, ValidationError

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

# Valid webhook event types from YooKassa
VALID_YOOKASSA_EVENTS = {
    "payment.succeeded",
    "payment.waiting_for_capture",
    "payment.canceled",
    "refund.succeeded",
}


class YookassaWebhookAmount(BaseModel):
    value: str
    currency: str


class YookassaWebhookMetadata(BaseModel):
    order_id: Optional[int] = None


class YookassaWebhookObject(BaseModel):
    id: str
    status: str
    amount: YookassaWebhookAmount
    metadata: Optional[YookassaWebhookMetadata] = None
    paid: Optional[bool] = None
    payment_method: Optional[Dict[str, Any]] = None


class YookassaWebhookPayload(BaseModel):
    type: str
    event: str
    object: YookassaWebhookObject


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


def verify_webhook_signature(body: bytes, signature: str, secret_key: str) -> bool:
    """
    Verify YooKassa webhook signature using HMAC-SHA256.
    
    YooKassa sends signature in header as: sha256=<hex_signature>
    The signature is computed as: HMAC-SHA256(body, secret_key)
    
    Args:
        body: Raw request body bytes
        signature: Signature from webhook header
        secret_key: YooKassa secret key
        
    Returns:
        True if signature is valid, False otherwise
    """
    if not signature or not secret_key:
        return False
    
    # YooKassa may send signature with "sha256=" prefix or without
    if signature.startswith("sha256="):
        signature = signature[7:]
    
    # Compute expected signature
    expected_signature = hmac.new(
        key=secret_key.encode('utf-8'),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(signature.lower(), expected_signature.lower())


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxy headers."""
    client_ip = request.client.host if request.client else "0.0.0.0"
    
    # Check X-Forwarded-For header if behind proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP from the chain (original client)
        client_ip = forwarded_for.split(",")[0].strip()
    
    return client_ip


def validate_webhook_payload(event: Dict[str, Any]) -> YookassaWebhookPayload:
    """
    Validate webhook payload structure using Pydantic.
    
    Args:
        event: Parsed JSON from webhook request
        
    Returns:
        Validated YookassaWebhookPayload object
        
    Raises:
        HTTPException: If validation fails
    """
    try:
        return YookassaWebhookPayload(**event)
    except ValidationError as e:
        logger.warning(f"Invalid webhook payload structure: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload structure")


@router.post("/payment/yookassa")
async def yookassa_webhook(
    request: Request,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Webhook for Yookassa payment status updates.
    
    Security measures:
    1. IP whitelist verification (YooKassa official IPs only)
    2. HMAC-SHA256 signature verification (if signature header present)
    3. Payload structure validation with Pydantic
    4. Event type whitelist validation
    """
    client_ip = get_client_ip(request)
    
    # 1. IP Whitelist check - verify request comes from YooKassa
    if not settings.DEBUG and not is_yookassa_ip(client_ip):
        logger.warning(f"Webhook request from unauthorized IP: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden: Invalid source IP")
    
    # Get raw body for signature verification
    try:
        body = await request.body()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read request body")
    
    # 2. Signature verification (YooKassa sends in X-Signature header)
    # Note: This is optional as YooKassa primarily relies on IP whitelist,
    # but we verify if signature is provided for defense in depth
    signature = request.headers.get("X-Signature") or request.headers.get("HTTP_X_SIGNATURE")
    
    if signature and settings.YOOKASSA_SECRET_KEY:
        if not verify_webhook_signature(body, signature, settings.YOOKASSA_SECRET_KEY):
            logger.warning(f"Invalid webhook signature from IP: {client_ip}")
            raise HTTPException(status_code=403, detail="Forbidden: Invalid signature")
        logger.debug(f"Webhook signature verified successfully")
    elif not settings.DEBUG and not is_yookassa_ip(client_ip):
        # If no signature and not from trusted IP, reject in production
        logger.warning(f"No signature provided and IP not whitelisted: {client_ip}")
        raise HTTPException(status_code=403, detail="Forbidden: Signature required")
    
    # 3. Parse and validate JSON payload
    try:
        import json
        event = json.loads(body)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Invalid JSON in webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # 4. Validate payload structure
    validated_payload = validate_webhook_payload(event)
    
    # 5. Validate event type (prevent processing unknown events)
    if validated_payload.event not in VALID_YOOKASSA_EVENTS:
        logger.warning(f"Unknown webhook event type: {validated_payload.event}")
        # Return OK to prevent retries, but don't process
        return {"status": "ok", "message": "Event type not processed"}
    
    # 6. Validate that metadata contains order_id
    if validated_payload.event.startswith("payment."):
        if not validated_payload.object.metadata or not validated_payload.object.metadata.order_id:
            logger.warning(f"Payment webhook missing order_id in metadata: {validated_payload.object.id}")
            raise HTTPException(status_code=400, detail="Missing order_id in metadata")
    
    logger.info(
        f"Received valid YooKassa webhook from {client_ip}: "
        f"event={validated_payload.event}, payment_id={validated_payload.object.id}"
    )
    
    # Process the webhook
    await order_service.process_payment_webhook(db, event)
    
    return {"status": "ok"}
