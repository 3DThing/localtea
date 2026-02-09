"""
Tests for YooKassa webhook security.
"""
import pytest
import hmac
import hashlib
import json
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


# Test data
VALID_WEBHOOK_PAYLOAD = {
    "type": "notification",
    "event": "payment.succeeded",
    "object": {
        "id": "test_payment_123",
        "status": "succeeded",
        "amount": {
            "value": "100.00",
            "currency": "RUB"
        },
        "paid": True,
        "metadata": {
            "order_id": 1
        },
        "payment_method": {
            "type": "bank_card"
        }
    }
}

INVALID_WEBHOOK_PAYLOAD = {
    "type": "notification",
    "event": "unknown.event",
    "object": {
        "id": "test_123"
    }
}


def generate_signature(body: bytes, secret_key: str) -> str:
    """Generate HMAC-SHA256 signature like YooKassa does."""
    return "sha256=" + hmac.new(
        key=secret_key.encode('utf-8'),
        msg=body,
        digestmod=hashlib.sha256
    ).hexdigest()


class TestWebhookSecurity:
    """Test webhook security measures."""
    
    def test_signature_verification_valid(self):
        """Test that valid signature passes verification."""
        from backend.api.v1.webhooks.endpoints import verify_webhook_signature
        
        body = json.dumps(VALID_WEBHOOK_PAYLOAD).encode()
        secret = "test_secret_key_123"
        signature = generate_signature(body, secret)
        
        assert verify_webhook_signature(body, signature, secret) is True
    
    def test_signature_verification_invalid(self):
        """Test that invalid signature fails verification."""
        from backend.api.v1.webhooks.endpoints import verify_webhook_signature
        
        body = json.dumps(VALID_WEBHOOK_PAYLOAD).encode()
        secret = "test_secret_key_123"
        wrong_signature = "sha256=invalid_signature_here"
        
        assert verify_webhook_signature(body, wrong_signature, secret) is False
    
    def test_signature_verification_tampered_body(self):
        """Test that signature fails if body is tampered."""
        from backend.api.v1.webhooks.endpoints import verify_webhook_signature
        
        original_body = json.dumps(VALID_WEBHOOK_PAYLOAD).encode()
        secret = "test_secret_key_123"
        signature = generate_signature(original_body, secret)
        
        # Tamper with the body
        tampered_body = json.dumps({**VALID_WEBHOOK_PAYLOAD, "extra": "field"}).encode()
        
        assert verify_webhook_signature(tampered_body, signature, secret) is False
    
    def test_signature_without_prefix(self):
        """Test that signature without sha256= prefix also works."""
        from backend.api.v1.webhooks.endpoints import verify_webhook_signature
        
        body = json.dumps(VALID_WEBHOOK_PAYLOAD).encode()
        secret = "test_secret_key_123"
        
        # Generate signature without prefix
        raw_signature = hmac.new(
            key=secret.encode('utf-8'),
            msg=body,
            digestmod=hashlib.sha256
        ).hexdigest()
        
        assert verify_webhook_signature(body, raw_signature, secret) is True
    
    def test_ip_whitelist_valid_ips(self):
        """Test that YooKassa IPs pass whitelist check."""
        from backend.api.v1.webhooks.endpoints import is_yookassa_ip
        
        valid_ips = [
            "185.71.76.1",
            "185.71.76.31",
            "185.71.77.15",
            "77.75.153.1",
            "77.75.156.11",
            "77.75.156.35",
            "77.75.154.200",
        ]
        
        for ip in valid_ips:
            assert is_yookassa_ip(ip) is True, f"IP {ip} should be valid"
    
    def test_ip_whitelist_invalid_ips(self):
        """Test that non-YooKassa IPs fail whitelist check."""
        from backend.api.v1.webhooks.endpoints import is_yookassa_ip
        
        invalid_ips = [
            "1.2.3.4",
            "192.168.1.1",
            "10.0.0.1",
            "8.8.8.8",
            "185.71.75.1",  # Close but not in range
        ]
        
        for ip in invalid_ips:
            assert is_yookassa_ip(ip) is False, f"IP {ip} should be invalid"
    
    def test_payload_validation_valid(self):
        """Test that valid payload passes validation."""
        from backend.api.v1.webhooks.endpoints import validate_webhook_payload
        
        result = validate_webhook_payload(VALID_WEBHOOK_PAYLOAD)
        assert result.event == "payment.succeeded"
        assert result.object.id == "test_payment_123"
        assert result.object.metadata.order_id == 1
    
    def test_payload_validation_invalid(self):
        """Test that malformed payload fails validation."""
        from backend.api.v1.webhooks.endpoints import validate_webhook_payload
        from fastapi import HTTPException
        
        invalid_payloads = [
            {},  # Empty
            {"type": "notification"},  # Missing event and object
            {"event": "test", "object": {}},  # Object missing required fields
            {"event": "test", "type": "notification", "object": {"status": "ok"}},  # Missing id and amount
        ]
        
        for payload in invalid_payloads:
            with pytest.raises(HTTPException) as exc_info:
                validate_webhook_payload(payload)
            assert exc_info.value.status_code == 400
    
    def test_event_whitelist(self):
        """Test that only whitelisted events are accepted."""
        from backend.api.v1.webhooks.endpoints import VALID_YOOKASSA_EVENTS
        
        expected_events = {
            "payment.succeeded",
            "payment.waiting_for_capture",
            "payment.canceled",
            "refund.succeeded",
        }
        
        assert VALID_YOOKASSA_EVENTS == expected_events


@pytest.mark.asyncio
async def test_webhook_rejects_unauthorized_ip(client: AsyncClient):
    """Test that webhook rejects requests from unauthorized IPs."""
    with patch('backend.core.config.settings.DEBUG', False):
        response = await client.post(
            "/api/v1/webhooks/payment/yookassa",
            json=VALID_WEBHOOK_PAYLOAD,
            headers={"X-Forwarded-For": "1.2.3.4"}
        )
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_webhook_accepts_valid_yookassa_ip(client: AsyncClient, db_session):
    """Test that webhook accepts requests from YooKassa IPs."""
    with patch('backend.core.config.settings.DEBUG', True):
        with patch('backend.services.order.order_service.process_payment_webhook', new_callable=AsyncMock) as mock_process:
            mock_process.return_value = None
            
            response = await client.post(
                "/api/v1/webhooks/payment/yookassa",
                json=VALID_WEBHOOK_PAYLOAD,
            )
            assert response.status_code == 200
            assert response.json()["status"] == "ok"
