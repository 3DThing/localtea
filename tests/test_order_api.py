import pytest
from backend.models.catalog import Category, Product, SKU
from backend.models.order import Order, OrderStatus
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch

@pytest.fixture
async def catalog_data(db_session: AsyncSession):
    # Create Category
    category = Category(name="Tea", slug="tea", description="Delicious tea")
    db_session.add(category)
    await db_session.flush()

    # Create Product
    product = Product(
        title="Green Tea",
        slug="green-tea",
        category_id=category.id,
        description="Fresh green tea"
    )
    db_session.add(product)
    await db_session.flush()

    # Create SKU
    sku = SKU(
        product_id=product.id,
        sku_code="GT-100",
        weight=100,
        price_cents=1000,
        quantity=50,
        is_active=True
    )
    db_session.add(sku)
    await db_session.commit()
    
    return {"category": category, "product": product, "sku": sku}

@pytest.mark.asyncio
async def test_checkout_success(client, auth_headers, catalog_data, db_session):
    sku_id = catalog_data["sku"].id
    
    # 1. Add item to cart
    await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 2},
        headers=auth_headers
    )

    # 2. Checkout
    # Mock Yookassa payment creation
    with patch("backend.services.payment.yookassa.YookassaPaymentService.create_payment") as mock_payment:
        mock_payment.return_value = {
            "payment_id": "pay_123",
            "payment_url": "https://yookassa.ru/pay",
            "status": "pending"
        }
        
        checkout_data = {
            # Current API schema: pickup does not require shipping_address
            "delivery_method": "pickup",
            "contact_info": {
                "firstname": "Test",
                "lastname": "User",
                "email": "test@example.com",
                "phone": "+79991234567",
            },
            "payment_method": "card",
        }

        response = await client.post(
            "/api/v1/orders/checkout",
            json=checkout_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "awaiting_payment"
        assert data["total_amount_cents"] == 2000 # 2 * 1000
        assert data["payment_url"] == "https://yookassa.ru/pay"

    # 3. Verify Stock Reduced
    # Need to refresh SKU from DB
    result = await db_session.execute(select(SKU).where(SKU.id == sku_id))
    sku = result.scalars().first()
    assert sku.reserved_quantity == 2

    # 4. Verify Cart Cleared
    cart_resp = await client.get("/api/v1/cart", headers=auth_headers)
    assert len(cart_resp.json()["items"]) == 0

@pytest.mark.asyncio
async def test_checkout_empty_cart(client, auth_headers):
    checkout_data = {
        "delivery_method": "pickup",
        "contact_info": {
            "firstname": "Test",
            "lastname": "User",
            "email": "test@example.com",
            "phone": "+79991234567",
        },
    }
    response = await client.post(
        "/api/v1/orders/checkout",
        json=checkout_data,
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "Корзина пуста" in response.json()["detail"]

@pytest.mark.asyncio
async def test_cancel_order(client, auth_headers, catalog_data, db_session):
    sku_id = catalog_data["sku"].id
    
    # 1. Create Order via Checkout
    await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 5},
        headers=auth_headers
    )
    
    with patch("backend.services.payment.yookassa.YookassaPaymentService.create_payment") as mock_payment:
        mock_payment.return_value = {
            "payment_id": "pay_123",
            "payment_url": "https://yookassa.ru/pay",
            "status": "pending"
        }
        checkout_data = {
            "delivery_method": "pickup",
            "contact_info": {
                "firstname": "T",
                "lastname": "E",
                "email": "t@e.com",
                "phone": "+79990000000",
            },
        }
        checkout_resp = await client.post("/api/v1/orders/checkout", json=checkout_data, headers=auth_headers)
        order_id = checkout_resp.json()["id"]

    # 2. Cancel Order
    response = await client.post(
        f"/api/v1/orders/{order_id}/cancel",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"

    # 3. Verify Stock Returned
    result = await db_session.execute(select(SKU).where(SKU.id == sku_id))
    sku = result.scalars().first()
    assert sku.reserved_quantity == 0

@pytest.mark.asyncio
async def test_get_orders(client, auth_headers, catalog_data):
    # Create an order first
    sku_id = catalog_data["sku"].id
    await client.post("/api/v1/cart/items", json={"sku_id": sku_id, "quantity": 1}, headers=auth_headers)
    with patch("backend.services.payment.yookassa.YookassaPaymentService.create_payment") as mock_payment:
        mock_payment.return_value = {"payment_id": "pay", "status": "pending", "payment_url": "url"}
        checkout_data = {
            "delivery_method": "pickup",
            "contact_info": {
                "firstname": "T",
                "lastname": "E",
                "email": "t@e.com",
                "phone": "+79990000000",
            },
        }
        await client.post("/api/v1/orders/checkout", json=checkout_data, headers=auth_headers)

    response = await client.get("/api/v1/orders", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

@pytest.mark.asyncio
async def test_get_order_detail(client, auth_headers, catalog_data):
    # Create an order
    sku_id = catalog_data["sku"].id
    await client.post("/api/v1/cart/items", json={"sku_id": sku_id, "quantity": 1}, headers=auth_headers)
    with patch("backend.services.payment.yookassa.YookassaPaymentService.create_payment") as mock_payment:
        mock_payment.return_value = {"payment_id": "pay", "status": "pending", "payment_url": "url"}
        checkout_data = {
            "delivery_method": "pickup",
            "contact_info": {
                "firstname": "T",
                "lastname": "E",
                "email": "t@e.com",
                "phone": "+79990000000",
            },
        }
        checkout_resp = await client.post("/api/v1/orders/checkout", json=checkout_data, headers=auth_headers)
        order_id = checkout_resp.json()["id"]

    response = await client.get(f"/api/v1/orders/{order_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == order_id
