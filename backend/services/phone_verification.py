"""
Сервис верификации телефона через звонок (sms.ru API).

Использует API callcheck от sms.ru для подтверждения номера телефона.
Пользователь должен позвонить на указанный номер для подтверждения.
"""

import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.config import settings
from backend.models.user import User

logger = logging.getLogger(__name__)


# Коды статусов sms.ru
STATUS_PENDING = 400        # Номер не подтвержден
STATUS_CONFIRMED = 401      # Номер подтвержден (авторизация успешна)
STATUS_EXPIRED = 402        # Истекло время или неправильный check_id


class PhoneVerificationError(Exception):
    """Ошибка верификации телефона."""
    pass


class PhoneVerificationService:
    """Сервис верификации телефона через звонок."""
    
    API_BASE_URL = "https://sms.ru"
    
    def __init__(self):
        self.api_id = settings.SMS_RU_API_ID
        self.timeout = settings.PHONE_VERIFICATION_TIMEOUT
    
    def _normalize_phone(self, phone: str) -> str:
        """
        Нормализовать номер телефона к формату 7XXXXXXXXXX.
        
        Args:
            phone: Номер телефона в любом формате
            
        Returns:
            Номер в формате 7XXXXXXXXXX
            
        Raises:
            PhoneVerificationError: Если номер некорректен
        """
        # Убираем все нецифровые символы
        digits = ''.join(c for c in phone if c.isdigit())
        
        # Обрабатываем разные форматы
        if len(digits) == 11 and digits.startswith('7'):
            return digits
        elif len(digits) == 11 and digits.startswith('8'):
            return '7' + digits[1:]
        elif len(digits) == 10:
            return '7' + digits
        else:
            raise PhoneVerificationError(
                f"Некорректный номер телефона. Ожидается формат +7XXXXXXXXXX"
            )
    
    async def initiate_call(self, phone: str) -> Dict[str, Any]:
        """
        Инициировать звонок для верификации.
        
        Args:
            phone: Номер телефона для верификации
            
        Returns:
            Словарь с информацией о звонке:
                - check_id: Идентификатор проверки
                - call_phone: Номер для звонка (raw)
                - call_phone_pretty: Номер для звонка (форматированный)
                
        Raises:
            PhoneVerificationError: При ошибке API
        """
        if not self.api_id:
            raise PhoneVerificationError(
                "Сервис верификации телефона не настроен. Обратитесь к администратору."
            )
        
        normalized_phone = self._normalize_phone(phone)
        
        logger.info(f"Initiating phone verification call for {normalized_phone[:4]}***{normalized_phone[-2:]}")
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.API_BASE_URL}/callcheck/add",
                    params={
                        "api_id": self.api_id,
                        "phone": normalized_phone,
                        "json": 1
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") != "OK":
                    error_msg = data.get('status_text', 'Неизвестная ошибка API')
                    logger.error(f"SMS.ru API error: {error_msg} (code: {data.get('status_code')})")
                    raise PhoneVerificationError(f"Ошибка API: {error_msg}")
                
                logger.info(f"Call initiated successfully, check_id: {data.get('check_id')}")
                
                return {
                    "check_id": data.get("check_id"),
                    "call_phone": data.get("call_phone"),
                    "call_phone_pretty": data.get("call_phone_pretty"),
                    "expires_at": datetime.now(timezone.utc) + timedelta(seconds=self.timeout)
                }
                
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during call initiation: {str(e)}")
            raise PhoneVerificationError(f"Ошибка подключения к сервису верификации")
        except Exception as e:
            logger.error(f"Unexpected error during call initiation: {str(e)}")
            raise PhoneVerificationError(f"Неожиданная ошибка: {str(e)}")
    
    async def check_status(self, check_id: str) -> Dict[str, Any]:
        """
        Проверить статус звонка.
        
        Args:
            check_id: Идентификатор проверки
            
        Returns:
            Словарь со статусом:
                - status_code: Код статуса (400, 401, 402)
                - status_text: Текст статуса
                - is_confirmed: True если подтверждено
                - is_expired: True если истекло
                - is_pending: True если ожидается
        """
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.API_BASE_URL}/callcheck/status",
                    params={
                        "api_id": self.api_id,
                        "check_id": check_id,
                        "json": 1
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                check_status = data.get("check_status")
                
                # Преобразуем в число если строка
                if isinstance(check_status, str):
                    try:
                        check_status = int(check_status)
                    except (ValueError, TypeError):
                        check_status = STATUS_PENDING
                
                return {
                    "status_code": check_status,
                    "status_text": data.get("check_status_text", ""),
                    "is_confirmed": check_status == STATUS_CONFIRMED,
                    "is_expired": check_status == STATUS_EXPIRED,
                    "is_pending": check_status == STATUS_PENDING
                }
                
        except Exception as e:
            logger.warning(f"Error checking status: {str(e)}")
            return {
                "status_code": STATUS_PENDING,
                "status_text": "Ошибка проверки статуса",
                "is_confirmed": False,
                "is_expired": False,
                "is_pending": True
            }
    
    async def start_verification(
        self, 
        db: AsyncSession, 
        user_id: int
    ) -> Dict[str, Any]:
        """
        Начать процесс верификации телефона для пользователя.
        
        Args:
            db: Сессия базы данных
            user_id: ID пользователя
            
        Returns:
            Информация для пользователя (номер для звонка, время и т.д.)
        """
        # Получаем пользователя
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise PhoneVerificationError("Пользователь не найден")
        
        if not user.phone_number:
            raise PhoneVerificationError("Номер телефона не указан")
        
        if user.is_phone_confirmed:
            raise PhoneVerificationError("Телефон уже подтвержден")
        
        # Инициируем звонок
        call_data = await self.initiate_call(user.phone_number)
        
        # Сохраняем check_id в БД
        user.phone_verification_check_id = call_data["check_id"]
        user.phone_verification_expires_at = call_data["expires_at"]
        
        await db.commit()
        
        return {
            "call_phone": call_data["call_phone"],
            "call_phone_pretty": call_data["call_phone_pretty"],
            "expires_at": call_data["expires_at"].isoformat(),
            "timeout_seconds": self.timeout
        }
    
    async def verify_call(
        self, 
        db: AsyncSession, 
        user_id: int
    ) -> Dict[str, Any]:
        """
        Проверить статус верификации для пользователя.
        
        Args:
            db: Сессия базы данных
            user_id: ID пользователя
            
        Returns:
            Статус верификации
        """
        # Получаем пользователя
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise PhoneVerificationError("Пользователь не найден")
        
        if user.is_phone_confirmed:
            return {
                "is_confirmed": True,
                "message": "Телефон уже подтвержден"
            }
        
        if not user.phone_verification_check_id:
            raise PhoneVerificationError("Верификация не инициирована")
        
        # Проверяем истекло ли время
        if user.phone_verification_expires_at:
            if datetime.now(timezone.utc) > user.phone_verification_expires_at:
                # Очищаем данные верификации
                user.phone_verification_check_id = None
                user.phone_verification_expires_at = None
                await db.commit()
                raise PhoneVerificationError("Время верификации истекло, запросите новый звонок")
        
        # Проверяем статус
        status = await self.check_status(user.phone_verification_check_id)
        
        if status["is_confirmed"]:
            # Подтверждаем телефон
            user.is_phone_confirmed = True
            user.phone_verification_check_id = None
            user.phone_verification_expires_at = None
            await db.commit()
            
            logger.info(f"Phone verified for user {user_id}")
            
            return {
                "is_confirmed": True,
                "message": "Телефон успешно подтвержден!"
            }
        
        if status["is_expired"]:
            user.phone_verification_check_id = None
            user.phone_verification_expires_at = None
            await db.commit()
            
            return {
                "is_confirmed": False,
                "is_expired": True,
                "message": "Время верификации истекло"
            }
        
        return {
            "is_confirmed": False,
            "is_pending": True,
            "message": "Ожидание звонка..."
        }


# Singleton instance
phone_verification_service = PhoneVerificationService()
