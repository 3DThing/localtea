import httpx
import uuid
import base64
from typing import Dict, Any, Optional
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
        
        # Общая сумма = товары + доставка - скидка промокода
        total_cents = order.total_amount_cents + (order.delivery_cost_cents or 0) - (order.discount_amount_cents or 0)
        if total_cents < 0:
            total_cents = 0
        
        payload = {
            "amount": {
                "value": f"{total_cents / 100:.2f}",
                "currency": "RUB"
            },
            "capture": True,
            "confirmation": {
                "type": "redirect",
                "return_url": f"{settings.YOOKASSA_RETURN_URL}?order_id={order.id}"
            },
            "description": description,
            "metadata": {
                "order_id": order.id
            }
        }
        
        # Add webhook URL if configured
        if settings.YOOKASSA_WEBHOOK_URL:
            payload["notification_url"] = settings.YOOKASSA_WEBHOOK_URL
        
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

    async def create_refund(
        self, 
        payment_id: str, 
        amount_cents: int, 
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a refund for a payment.
        
        Args:
            payment_id: The YooKassa payment ID
            amount_cents: Amount to refund in cents
            description: Optional refund description
            
        Returns:
            Refund details from YooKassa
        """
        url = f"{self.BASE_URL}/refunds"
        idempotence_key = str(uuid.uuid4())
        
        payload = {
            "payment_id": payment_id,
            "amount": {
                "value": f"{amount_cents / 100:.2f}",
                "currency": "RUB"
            }
        }
        
        if description:
            payload["description"] = description
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=payload,
                headers=self._get_headers(idempotence_key)
            )
            
            if response.status_code not in (200, 201):
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("description", "Refund failed")
                print(f"Yookassa Refund Error: {response.text}")
                raise HTTPException(status_code=502, detail=f"Refund error: {error_msg}")
            
            data = response.json()
            return {
                "refund_id": data["id"],
                "status": data["status"],
                "amount_cents": int(float(data["amount"]["value"]) * 100),
                "created_at": data["created_at"],
                "payment_id": data["payment_id"]
            }

    async def get_refund(self, refund_id: str) -> Dict[str, Any]:
        """Get refund status by ID."""
        url = f"{self.BASE_URL}/refunds/{refund_id}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to get refund status")
            
            return response.json()

    async def list_refunds(self, payment_id: str) -> Dict[str, Any]:
        """List all refunds for a payment."""
        url = f"{self.BASE_URL}/refunds"
        params = {"payment_id": payment_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to list refunds")
            
            return response.json()


# Singleton instance
payment_service = YookassaPaymentService()
