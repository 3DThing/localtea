import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_dashboard_stats(client: AsyncClient, superuser_token_headers):
    response = await client.get("/api/v1/dashboard/stats", headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "orders" in data
    assert "sales" in data
    assert "users" in data
    assert "logs" in data
    assert "sales_chart" in data
