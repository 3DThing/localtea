"""
Тесты для авторизации пользователя по звонку с его номера телефона.

Система использует API sms.ru для инициирования звонка на номер пользователя.
Пользователь должен позвонить на предоставленный номер в течение 5 минут.
После получения звонка система отправляет webhook с подтверждением авторизации.
"""

import pytest
import httpx
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, Any
import json


# Constants for SMS.ru Call Check API
SMS_RU_API_BASE_URL = "https://sms.ru"
SMS_RU_CALLCHECK_ADD_ENDPOINT = f"{SMS_RU_API_BASE_URL}/callcheck/add"
SMS_RU_CALLCHECK_STATUS_ENDPOINT = f"{SMS_RU_API_BASE_URL}/callcheck/status"

API_ID = "D9A62F49-2FC5-213A-0404-61F414FB8088"
TEST_PHONE = "79990847051"


class PhoneCallAuthService:
    """
    Сервис для авторизации пользователя по звонку с его телефона.
    
    Workflow:
    1. Запрос инициирования звонка (передача номера пользователя)
    2. Получение номера, на который должен позвонить пользователь
    3. Пользователь звонит в течение 5 минут
    4. Проверка статуса авторизации через API или webhook
    """
    
    def __init__(self, api_id: str):
        """
        Инициализация сервиса.
        
        Args:
            api_id: Уникальный ключ API для доступа к sms.ru
        """
        self.api_id = api_id
        self.client = httpx.Client()
    
    def initiate_call_check(self, phone: str) -> Dict[str, Any]:
        """
        Инициировать проверку звонка для номера телефона.
        
        API: POST /callcheck/add
        
        Args:
            phone: Номер телефона пользователя для авторизации (e.g., 79990847051)
        
        Returns:
            dict: Ответ с информацией о звонке:
                - status: "OK" или описание ошибки
                - status_code: код статуса (100, 202, итд)
                - check_id: идентификатор проверки для последующей проверки статуса
                - call_phone: номер телефона, на который должен позвонить пользователь
                - call_phone_pretty: красивый формат номера (e.g., "+7 (800) 500-8275")
                - call_phone_html: HTML ссылка для мобильных устройств
        
        Raises:
            httpx.HTTPError: Если запрос не выполнен
            ValueError: Если ответ некорректный
        """
        params = {
            "api_id": self.api_id,
            "phone": phone,
            "json": 1
        }
        
        response = self.client.get(SMS_RU_CALLCHECK_ADD_ENDPOINT, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get("status") != "OK":
            raise ValueError(
                f"Ошибка API sms.ru: {data.get('status')} "
                f"(код: {data.get('status_code')})"
            )
        
        return data
    
    def check_call_status(self, check_id: str) -> Dict[str, Any]:
        """
        Проверить статус авторизации по звонку.
        
        API: GET /callcheck/status
        
        Args:
            check_id: Идентификатор проверки, полученный при инициировании звонка
        
        Returns:
            dict: Ответ с информацией о статусе:
                - status: "OK" или описание ошибки
                - status_code: код статуса (100)
                - check_status: статус авторизации
                  - "400": Номер пока не подтвержден
                  - "401": Номер подтвержден (авторизация успешна)
                  - "402": Истекло время или неправильный check_id
                - check_status_text: описание статуса на русском
        
        Raises:
            httpx.HTTPError: Если запрос не выполнен
            ValueError: Если ответ некорректный
        """
        params = {
            "api_id": self.api_id,
            "check_id": check_id,
            "json": 1
        }
        
        response = self.client.get(SMS_RU_CALLCHECK_STATUS_ENDPOINT, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get("status") != "OK":
            raise ValueError(
                f"Ошибка API sms.ru: {data.get('status')} "
                f"(код: {data.get('status_code')})"
            )
        
        return data
    
    def close(self):
        """Закрыть HTTP клиент."""
        self.client.close()


# ============================================================================
# TESTS
# ============================================================================

class TestPhoneCallAuthInitiation:
    """Тесты для инициирования авторизации по звонку."""
    
    @pytest.fixture
    def service(self):
        """Создать сервис для тестов."""
        return PhoneCallAuthService(API_ID)
    
    def test_initiate_call_check_success(self, service):
        """
        Тест: Успешная инициализация звонка.
        
        Сценарий:
        - Пользователь передает свой номер телефона
        - API возвращает номер для звонка и идентификатор проверки
        - Данные сохраняются для последующей проверки статуса
        """
        mock_response = {
            "status": "OK",
            "status_code": 100,
            "check_id": "201737-542",
            "call_phone": "78005008275",
            "call_phone_pretty": "+7 (800) 500-8275",
            "call_phone_html": "<a href=\"callto:78005008275\">+7 (800) 500-8275</a>"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            result = service.initiate_call_check(TEST_PHONE)
            
            # Проверяем, что запрос был сделан с правильными параметрами
            mock_get.assert_called_once()
            call_args = mock_get.call_args
            assert call_args[1]['params']['api_id'] == API_ID
            assert call_args[1]['params']['phone'] == TEST_PHONE
            assert call_args[1]['params']['json'] == 1
            
            # Проверяем ответ
            assert result['status'] == "OK"
            assert result['status_code'] == 100
            assert result['check_id'] == "201737-542"
            assert result['call_phone'] == "78005008275"
            assert result['call_phone_pretty'] == "+7 (800) 500-8275"
    
    def test_initiate_call_check_invalid_phone(self, service):
        """
        Тест: Ошибка при неверном номере телефона.
        
        Сценарий:
        - Пользователь передает некорректный номер телефона
        - API возвращает ошибку 202 (неверный номер)
        - Система должна уведомить пользователя об ошибке
        """
        mock_response = {
            "status": "ERROR",
            "status_code": 202,
            "status_text": "Номер телефона пользователя указан неверно"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            with pytest.raises(ValueError) as exc_info:
                service.initiate_call_check("invalid_phone")
            
            assert "Ошибка API sms.ru" in str(exc_info.value)
            assert "202" in str(exc_info.value)
    
    def test_initiate_call_check_api_error(self, service):
        """
        Тест: Ошибка при проблеме с API.
        
        Сценарий:
        - API sms.ru недоступен или возвращает ошибку
        - HTTP клиент вызывает исключение
        - Система должна обработать ошибку корректно
        """
        with patch.object(service.client, 'get') as mock_get:
            mock_get.side_effect = httpx.ConnectError("Connection failed")
            
            with pytest.raises(httpx.ConnectError):
                service.initiate_call_check(TEST_PHONE)


class TestPhoneCallAuthStatusCheck:
    """Тесты для проверки статуса авторизации по звонку."""
    
    @pytest.fixture
    def service(self):
        """Создать сервис для тестов."""
        return PhoneCallAuthService(API_ID)
    
    def test_check_call_status_pending(self, service):
        """
        Тест: Статус "ожидание звонка".
        
        Сценарий:
        - Пользователю отправлен номер для звонка
        - Пользователь еще не позвонил
        - Статус: 400 (номер не подтвержден)
        """
        mock_response = {
            "status": "OK",
            "status_code": 100,
            "check_status": "400",
            "check_status_text": "Авторизация по звонку: номер пока не подтвержден"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            result = service.check_call_status("201737-542")
            
            assert result['status'] == "OK"
            assert result['check_status'] == "400"
            assert "не подтвержден" in result['check_status_text']
    
    def test_check_call_status_confirmed(self, service):
        """
        Тест: Статус "звонок получен, авторизация успешна".
        
        Сценарий:
        - Пользователь позвонил на предоставленный номер
        - API подтвердил получение звонка
        - Статус: 401 (номер подтвержден)
        - Пользователь может быть авторизован
        """
        mock_response = {
            "status": "OK",
            "status_code": 100,
            "check_status": "401",
            "check_status_text": "Авторизация по звонку: номер подтвержден"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            result = service.check_call_status("201737-542")
            
            assert result['status'] == "OK"
            assert result['check_status'] == "401"
            assert "подтвережден" in result['check_status_text']
    
    def test_check_call_status_expired(self, service):
        """
        Тест: Статус "время истекло".
        
        Сценарий:
        - Отведенное время (5 минут) истекло
        - Пользователь не позвонил
        - Статус: 402 (истекло время или неправильный check_id)
        - Нужно инициировать новую попытку авторизации
        """
        mock_response = {
            "status": "OK",
            "status_code": 100,
            "check_status": "402",
            "check_status_text": "Авторизация по звонку: истекло время"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            result = service.check_call_status("201737-542")
            
            assert result['status'] == "OK"
            assert result['check_status'] == "402"
            assert "истекло" in result['check_status_text'].lower()
    
    def test_check_call_status_invalid_check_id(self, service):
        """
        Тест: Ошибка при неверном check_id.
        
        Сценарий:
        - Передан неверный или несуществующий check_id
        - API возвращает ошибку
        """
        mock_response = {
            "status": "ERROR",
            "status_code": 402,
            "status_text": "Неправильный check_id"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            with pytest.raises(ValueError) as exc_info:
                service.check_call_status("invalid-check-id")
            
            assert "Ошибка API sms.ru" in str(exc_info.value)


class TestPhoneCallAuthFlow:
    """Интеграционные тесты для полного workflow авторизации по звонку."""
    
    @pytest.fixture
    def service(self):
        """Создать сервис для тестов."""
        return PhoneCallAuthService(API_ID)
    
    def test_complete_auth_flow_success(self, service):
        """
        Тест: Полный успешный workflow авторизации.
        
        Сценарий:
        1. Пользователь заходит на страницу авторизации
        2. Вводит свой номер телефона
        3. Система инициирует звонок через API sms.ru
        4. Получает номер для звонка и check_id
        5. Пользователь видит инструкцию позвонить на номер
        6. Пользователь звонит
        7. Система проверяет статус и получает подтверждение
        8. Пользователь авторизован
        """
        # Шаг 1-3: Инициирование звонка
        initiate_response = {
            "status": "OK",
            "status_code": 100,
            "check_id": "201737-542",
            "call_phone": "78005008275",
            "call_phone_pretty": "+7 (800) 500-8275",
            "call_phone_html": "<a href=\"callto:78005008275\">+7 (800) 500-8275</a>"
        }
        
        # Шаг 4-7: Проверка статуса
        status_response = {
            "status": "OK",
            "status_code": 100,
            "check_status": "401",
            "check_status_text": "Авторизация по звонку: номер подтвержден"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            # Первый вызов - инициирование звонка
            mock_get.side_effect = [
                MagicMock(json=lambda: initiate_response),
                MagicMock(json=lambda: status_response)
            ]
            
            # Инициируем звонок
            init_result = service.initiate_call_check(TEST_PHONE)
            assert init_result['status'] == "OK"
            assert init_result['check_id'] == "201737-542"
            assert init_result['call_phone_pretty'] == "+7 (800) 500-8275"
            
            # Проверяем статус после звонка
            check_result = service.check_call_status(init_result['check_id'])
            assert check_result['status'] == "OK"
            assert check_result['check_status'] == "401"
            # Пользователь авторизован!
    
    def test_complete_auth_flow_timeout(self, service):
        """
        Тест: Workflow с истечением времени.
        
        Сценарий:
        1. Система инициирует звонок
        2. Пользователь не звонит в течение 5 минут
        3. Система проверяет статус и получает ошибку 402
        4. Пользователю предлагается попробовать заново
        """
        # Первый вызов - инициирование
        initiate_response = {
            "status": "OK",
            "status_code": 100,
            "check_id": "201737-542",
            "call_phone": "78005008275",
            "call_phone_pretty": "+7 (800) 500-8275"
        }
        
        # Второй вызов - истекло время
        timeout_response = {
            "status": "OK",
            "status_code": 100,
            "check_status": "402",
            "check_status_text": "Авторизация по звонку: истекло время"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.side_effect = [
                MagicMock(json=lambda: initiate_response),
                MagicMock(json=lambda: timeout_response)
            ]
            
            # Инициируем звонок
            init_result = service.initiate_call_check(TEST_PHONE)
            check_id = init_result['check_id']
            
            # Пользователь не звонит, и время истекает
            status_result = service.check_call_status(check_id)
            
            assert status_result['check_status'] == "402"
            # Нужна повторная попытка авторизации


class TestPhoneCallAuthAPIResponse:
    """Тесты для проверки корректности обработки ответов API."""
    
    @pytest.fixture
    def service(self):
        """Создать сервис для тестов."""
        return PhoneCallAuthService(API_ID)
    
    def test_response_contains_all_required_fields(self, service):
        """
        Тест: Ответ содержит все требуемые поля.
        
        Проверяем, что ответ от API содержит:
        - status: статус выполнения
        - status_code: код выполнения
        - check_id: идентификатор проверки
        - call_phone: номер телефона
        - call_phone_pretty: красивый формат номера
        """
        mock_response = {
            "status": "OK",
            "status_code": 100,
            "check_id": "201737-542",
            "call_phone": "78005008275",
            "call_phone_pretty": "+7 (800) 500-8275",
            "call_phone_html": "<a href=\"callto:78005008275\">+7 (800) 500-8275</a>"
        }
        
        with patch.object(service.client, 'get') as mock_get:
            mock_get.return_value.json.return_value = mock_response
            
            result = service.initiate_call_check(TEST_PHONE)
            
            # Проверяем наличие всех полей
            assert 'status' in result
            assert 'status_code' in result
            assert 'check_id' in result
            assert 'call_phone' in result
            assert 'call_phone_pretty' in result
            
            # Проверяем формат check_id (например: "201737-542")
            assert len(result['check_id']) > 0
            assert '-' in result['check_id']
            
            # Проверяем формат номера телефона
            assert result['call_phone'].isdigit()
            assert len(result['call_phone']) >= 10
            
            # Проверяем красивый формат
            assert '+7' in result['call_phone_pretty']
            assert '(' in result['call_phone_pretty']
            assert ')' in result['call_phone_pretty']
    
    def test_response_phone_format_parsing(self, service):
        """
        Тест: Парсинг формата номера телефона.
        
        Проверяем корректность форматирования номера:
        - Из 78005008275
        - В +7 (800) 500-8275
        """
        raw_phone = "78005008275"
        pretty_phone = "+7 (800) 500-8275"
        
        # Простая проверка форматирования
        # Убираем спецсимволы из красивого формата
        digits_only = ''.join(c for c in pretty_phone if c.isdigit())
        assert digits_only == raw_phone


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
