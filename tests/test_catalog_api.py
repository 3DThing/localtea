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
async def test_get_categories(client, catalog_data):
    response = await client.get("/api/v1/catalog/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["slug"] == "tea"

@pytest.mark.asyncio
async def test_get_products_list(client, catalog_data):
    response = await client.get("/api/v1/catalog/products")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["slug"] == "green-tea"

@pytest.mark.asyncio
async def test_get_product_detail(client, catalog_data):
    product_slug = catalog_data["product"].slug
    response = await client.get(f"/api/v1/catalog/products/{product_slug}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Green Tea"
    assert len(data["skus"]) == 1

@pytest.mark.asyncio
async def test_get_product_detail_not_found(client):
    response = await client.get("/api/v1/catalog/products/non-existent-slug")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_sku_detail(client, catalog_data):
    sku_id = catalog_data["sku"].id
    response = await client.get(f"/api/v1/catalog/skus/{sku_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["sku_code"] == "GT-100"
    assert data["price_cents"] == 1000

@pytest.mark.asyncio
async def test_get_sku_detail_not_found(client):
    response = await client.get("/api/v1/catalog/skus/999999")
    assert response.status_code == 404
