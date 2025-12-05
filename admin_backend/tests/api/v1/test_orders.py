import pytest
from httpx import AsyncClient
from backend.models.order import Order, OrderStatus
from datetime import datetime, timezone

@pytest.mark.asyncio
async def test_read_orders(client: AsyncClient, superuser_token_headers, db_session, superuser):
    # Create a dummy order
    order = Order(
        user_id=superuser.id,
        total_amount_cents=1000,
        status=OrderStatus.AWAITING_PAYMENT,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    await db_session.commit()
    
    response = await client.get("/api/v1/orders/", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["id"] == order.id

@pytest.mark.asyncio
async def test_update_order_status(client: AsyncClient, superuser_token_headers, db_session, superuser):
    order = Order(
        user_id=superuser.id,
        total_amount_cents=1000,
        status=OrderStatus.AWAITING_PAYMENT,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    await db_session.commit()
    
    response = await client.patch(
        f"/api/v1/orders/{order.id}/status",
        headers=superuser_token_headers,
        json={"status": "paid"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "paid"

@pytest.mark.asyncio
async def test_cancel_order(client: AsyncClient, superuser_token_headers, db_session, superuser):
    order = Order(
        user_id=superuser.id,
        total_amount_cents=1000,
        status=OrderStatus.AWAITING_PAYMENT,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    await db_session.commit()
    
    response = await client.post(
        f"/api/v1/orders/{order.id}/cancel",
        headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"

@pytest.mark.asyncio
async def test_update_order_not_found(client: AsyncClient, superuser_token_headers):
    response = await client.patch(
        "/api/v1/orders/99999/status",
        headers=superuser_token_headers,
        json={"status": "shipped"}
    )
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_read_order_by_id(client: AsyncClient, superuser_token_headers, db_session, superuser):
    # Create an order
    order = Order(
        user_id=superuser.id,
        total_amount_cents=5000,
        status=OrderStatus.PAID,
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(order)
    await db_session.commit()
    
    response = await client.get(
        f"/api/v1/orders/{order.id}",
        headers=superuser_token_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order.id
    assert data["status"] == "paid"
