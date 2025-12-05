import httpx
import uuid
import base64
from typing import Dict, Any
from fastapi import HTTPException
from backend.services.payment.base import PaymentService
from backend.core.config import settings
from backend.models.order import Order

class YookassaPaymentService(PaymentService):
    BASE_URL = "https://api.yookassa.ru/v3"

    def _get_headers(self, idempotence_key: str = None) -> Dict[str, str]:
        if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
            raise HTTPException(status_code=500, detail="Yookassa credentials not configured")
            
        auth_str = f"{settings.YOOKASSA_SHOP_ID}:{settings.YOOKASSA_SECRET_KEY}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/json"
        }
        if idempotence_key:
            headers["Idempotence-Key"] = idempotence_key
        return headers

    async def create_payment(self, order: Order, description: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/payments"
        idempotence_key = str(uuid.uuid4())
        
        payload = {
            "amount": {
                "value": f"{order.total_amount_cents / 100:.2f}",
                "currency": "RUB"
            },
            "capture": True,
            "confirmation": {
                "type": "redirect",
                "return_url": settings.YOOKASSA_RETURN_URL
            },
            "description": description,
            "metadata": {
                "order_id": order.id
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, 
                json=payload, 
                headers=self._get_headers(idempotence_key)
            )
            
            if response.status_code not in (200, 201):
                # Log error here
                print(f"Yookassa Error: {response.text}")
                raise HTTPException(status_code=502, detail="Payment provider error")
                
            data = response.json()
            return {
                "payment_id": data["id"],
                "payment_url": data["confirmation"]["confirmation_url"],
                "status": data["status"]
            }

    async def check_payment(self, payment_id: str) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/payments/{payment_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, 
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Payment provider error")
                
            return response.json()

# Singleton instance? Or factory?
# For now, just instance.
payment_service = YookassaPaymentService()
