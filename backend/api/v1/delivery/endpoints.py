"""
API endpoints для расчёта доставки
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from backend.services.delivery import delivery_service, DeliveryOption

router = APIRouter()


class DeliveryCalculateRequest(BaseModel):
    """Запрос расчёта доставки"""
    postal_code: str = Field(..., min_length=6, max_length=6, description="Индекс получателя")
    weight_grams: int = Field(..., ge=1, le=50000, description="Вес в граммах")


class DeliveryOptionResponse(BaseModel):
    """Вариант доставки"""
    mail_type: str
    mail_type_name: str
    total_cost: float
    total_cost_cents: int
    delivery_min_days: int
    delivery_max_days: int


class DeliveryCalculateResponse(BaseModel):
    """Ответ расчёта доставки"""
    options: List[DeliveryOptionResponse]
    cheapest: Optional[DeliveryOptionResponse] = None


@router.post("/calculate", response_model=DeliveryCalculateResponse)
async def calculate_delivery(request: DeliveryCalculateRequest):
    """
    Рассчитать стоимость доставки Почтой России
    
    Возвращает все доступные варианты доставки отсортированные по цене.
    """
    options = await delivery_service.calculate_all_options(
        request.postal_code,
        request.weight_grams
    )
    
    if not options:
        raise HTTPException(
            status_code=400,
            detail="Не удалось рассчитать доставку. Проверьте корректность индекса."
        )
    
    response_options = [
        DeliveryOptionResponse(
            mail_type=opt.mail_type,
            mail_type_name=opt.mail_type_name,
            total_cost=opt.total_cost,
            total_cost_cents=int(opt.total_cost * 100),
            delivery_min_days=opt.delivery_min_days,
            delivery_max_days=opt.delivery_max_days
        )
        for opt in options
    ]
    
    return DeliveryCalculateResponse(
        options=response_options,
        cheapest=response_options[0] if response_options else None
    )


class DeliveryMethodsResponse(BaseModel):
    """Доступные методы доставки"""
    methods: List[dict]


@router.get("/methods", response_model=DeliveryMethodsResponse)
async def get_delivery_methods():
    """
    Получить список доступных методов доставки
    """
    return DeliveryMethodsResponse(
        methods=[
            {
                "id": "pickup",
                "name": "Самовывоз",
                "description": "Бесплатно. Забрать заказ самостоятельно.",
                "cost": 0,
                "requires_address": False
            },
            {
                "id": "russian_post",
                "name": "Почта России",
                "description": "Доставка почтой на указанный адрес.",
                "cost": None,  # Расчитывается динамически
                "requires_address": True
            }
        ]
    )
