"""
Сервис расчёта стоимости доставки Почтой России
"""

import httpx
from dataclasses import dataclass
from typing import Optional, List
from backend.core.config import settings


@dataclass
class DeliveryOption:
    """Вариант доставки"""
    mail_type: str              # Тип отправления (ключ)
    mail_type_name: str         # Название типа
    total_cost: float           # Стоимость в рублях
    delivery_min_days: int      # Мин. срок (дней)
    delivery_max_days: int      # Макс. срок (дней)


# Типы отправлений Почты России
MAIL_TYPES = {
    "standard": 27030,          # Посылка стандарт
    "first_class": 47030,       # Посылка 1 класса  
    "ems": 7030,                # EMS
}

# Адрес отправителя (склад LocalTea)
SENDER_POSTAL_CODE = settings.SENDER_POSTAL_CODE if hasattr(settings, 'SENDER_POSTAL_CODE') else "111020"


class DeliveryService:
    """Сервис расчёта доставки"""
    
    BASE_URL = "https://tariff.pochta.ru/v2/calculate/tariff"
    
    async def calculate_single(
        self,
        recipient_postal_code: str,
        weight_grams: int,
        mail_type: str = "standard",
    ) -> Optional[DeliveryOption]:
        """
        Рассчитать стоимость одного типа доставки
        
        Args:
            recipient_postal_code: Индекс получателя
            weight_grams: Вес в граммах
            mail_type: Тип отправления
        
        Returns:
            DeliveryOption или None при ошибке
        """
        params = {
            "from": SENDER_POSTAL_CODE,
            "to": recipient_postal_code,
            "weight": weight_grams,
            "object": MAIL_TYPES.get(mail_type, 27030),
            "pack": 10,  # Упаковка отправителя
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.BASE_URL,
                    params=params,
                    headers={"Accept": "application/json"},
                    timeout=10.0
                )
                
                data = response.json()
                
                # Проверка ошибок
                if "errors" in data and data["errors"]:
                    return None
                
                if "pay" not in data:
                    return None
                
                return DeliveryOption(
                    mail_type=mail_type,
                    mail_type_name=data.get("name", "Неизвестно"),
                    total_cost=data.get("pay", 0) / 100,
                    delivery_min_days=data.get("delivery", {}).get("min", 0),
                    delivery_max_days=data.get("delivery", {}).get("max", 0)
                )
            except Exception:
                return None
    
    async def calculate_all_options(
        self,
        recipient_postal_code: str,
        weight_grams: int
    ) -> List[DeliveryOption]:
        """
        Рассчитать все варианты доставки
        
        Args:
            recipient_postal_code: Индекс получателя
            weight_grams: Вес в граммах
        
        Returns:
            Список вариантов доставки, отсортированных по цене
        """
        options = []
        
        for mail_type in MAIL_TYPES:
            option = await self.calculate_single(
                recipient_postal_code,
                weight_grams,
                mail_type
            )
            if option:
                options.append(option)
        
        return sorted(options, key=lambda x: x.total_cost)
    
    async def get_cheapest_option(
        self,
        recipient_postal_code: str,
        weight_grams: int
    ) -> Optional[DeliveryOption]:
        """Получить самый дешёвый вариант доставки"""
        options = await self.calculate_all_options(recipient_postal_code, weight_grams)
        return options[0] if options else None


delivery_service = DeliveryService()
