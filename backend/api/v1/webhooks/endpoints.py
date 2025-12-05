from typing import Any, Dict
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.dependencies import deps
from backend.services.order import order_service

router = APIRouter()

@router.post("/payment/yookassa")
async def yookassa_webhook(
    request: Request,
    db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Webhook for Yookassa payment status updates.
    """
    # IP Whitelist check could be here (check request.client.host against Yookassa subnets)
    # For MVP we skip strict IP check or assume it's handled by firewall/nginx
    
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
        
    await order_service.process_payment_webhook(db, event)
    
    return {"status": "ok"}
