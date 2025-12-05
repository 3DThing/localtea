from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.models.order import Order

class PaymentService(ABC):
    @abstractmethod
    async def create_payment(self, order: Order, description: str) -> Dict[str, Any]:
        """
        Create a payment in the external system.
        Returns a dictionary containing payment_url and payment_id.
        """
        pass

    @abstractmethod
    async def check_payment(self, payment_id: str) -> Dict[str, Any]:
        """
        Check payment status in the external system.
        """
        pass
