import pytest
from backend.models.catalog import Category, Product, SKU
from sqlalchemy.ext.asyncio import AsyncSession

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
async def test_add_item_to_cart(client, auth_headers, catalog_data):
    sku_id = catalog_data["sku"].id
    response = await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 2},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["sku"]["id"] == sku_id
    assert data["items"][0]["quantity"] == 2

@pytest.mark.asyncio
async def test_add_item_insufficient_stock(client, auth_headers, catalog_data):
    sku_id = catalog_data["sku"].id
    # Stock is 50
    response = await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 100},
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "Not enough stock" in response.json()["detail"]

@pytest.mark.asyncio
async def test_add_item_non_existent_sku(client, auth_headers):
    response = await client.post(
        "/api/v1/cart/items",
        json={"sku_id": 999999, "quantity": 1},
        headers=auth_headers
    )
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_update_cart_item(client, auth_headers, catalog_data):
    # Add item first
    sku_id = catalog_data["sku"].id
    add_resp = await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 1},
        headers=auth_headers
    )
    item_id = add_resp.json()["items"][0]["id"]

    # Update quantity
    response = await client.patch(
        f"/api/v1/cart/items/{item_id}",
        json={"quantity": 5},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["quantity"] == 5

@pytest.mark.asyncio
async def test_remove_cart_item(client, auth_headers, catalog_data):
    # Add item first
    sku_id = catalog_data["sku"].id
    add_resp = await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 1},
        headers=auth_headers
    )
    item_id = add_resp.json()["items"][0]["id"]

    # Remove item
    response = await client.delete(
        f"/api/v1/cart/items/{item_id}",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 0

@pytest.mark.asyncio
async def test_clear_cart(client, auth_headers, catalog_data):
    # Add item first
    sku_id = catalog_data["sku"].id
    await client.post(
        "/api/v1/cart/items",
        json={"sku_id": sku_id, "quantity": 1},
        headers=auth_headers
    )

    # Clear cart
    response = await client.delete(
        "/api/v1/cart",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 0
