import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_category(client: AsyncClient, superuser_token_headers):
    response = await client.post(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers,
        json={
            "name": "Test Category",
            "slug": "test-category",
            "description": "Test Description"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Category"
    assert data["id"] is not None
    return data["id"]

@pytest.mark.asyncio
async def test_create_product(client: AsyncClient, superuser_token_headers):
    # First create a category
    cat_response = await client.post(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers,
        json={"name": "Tea", "slug": "tea"}
    )
    cat_id = cat_response.json()["id"]
    
    response = await client.post(
        "/api/v1/catalog/products",
        headers=superuser_token_headers,
        json={
            "title": "Green Tea",
            "slug": "green-tea",
            "category_id": cat_id,
            "description": "Delicious"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Green Tea"
    assert data["category_id"] == cat_id


@pytest.mark.asyncio
async def test_create_product_invalid_category(client: AsyncClient, superuser_token_headers):
    response = await client.post(
        "/api/v1/catalog/products",
        headers=superuser_token_headers,
        json={
            "title": "Invalid Product",
            "slug": "invalid-product",
            "category_id": 99999,
            "description": "Should fail"
        }
    )
    assert response.status_code != 200

@pytest.mark.asyncio
async def test_update_category(client: AsyncClient, superuser_token_headers):
    # Create
    create_res = await client.post(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers,
        json={"name": "To Update", "slug": "to-update"}
    )
    cat_id = create_res.json()["id"]

    # Update
    response = await client.patch(
        f"/api/v1/catalog/categories/{cat_id}",
        headers=superuser_token_headers,
        json={"name": "Updated Name"}
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"

@pytest.mark.asyncio
async def test_delete_category(client: AsyncClient, superuser_token_headers):
    # Create
    create_res = await client.post(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers,
        json={"name": "To Delete", "slug": "to-delete"}
    )
    cat_id = create_res.json()["id"]

    # Delete
    response = await client.delete(
        f"/api/v1/catalog/categories/{cat_id}",
        headers=superuser_token_headers
    )
    assert response.status_code == 200

    # Verify deleted
    get_res = await client.get(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers
    )
    categories = get_res.json()
    assert not any(c["id"] == cat_id for c in categories)

@pytest.mark.asyncio
async def test_update_product(client: AsyncClient, superuser_token_headers):
    # Create Category
    cat_res = await client.post(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers,
        json={"name": "Prod Cat", "slug": "prod-cat"}
    )
    cat_id = cat_res.json()["id"]

    # Create Product
    prod_res = await client.post(
        "/api/v1/catalog/products",
        headers=superuser_token_headers,
        json={
            "title": "To Update",
            "slug": "prod-to-update",
            "category_id": cat_id,
            "description": "Desc"
        }
    )
    prod_id = prod_res.json()["id"]

    # Update
    response = await client.patch(
        f"/api/v1/catalog/products/{prod_id}",
        headers=superuser_token_headers,
        json={"title": "Updated Product Title"}
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Product Title"

@pytest.mark.asyncio
async def test_delete_product(client: AsyncClient, superuser_token_headers):
    # Create Category
    cat_res = await client.post(
        "/api/v1/catalog/categories",
        headers=superuser_token_headers,
        json={"name": "Prod Cat Del", "slug": "prod-cat-del"}
    )
    cat_id = cat_res.json()["id"]

    # Create Product
    prod_res = await client.post(
        "/api/v1/catalog/products",
        headers=superuser_token_headers,
        json={
            "title": "To Delete",
            "slug": "prod-to-delete",
            "category_id": cat_id,
            "description": "Desc"
        }
    )
    prod_id = prod_res.json()["id"]

    # Delete
    response = await client.delete(
        f"/api/v1/catalog/products/{prod_id}",
        headers=superuser_token_headers
    )
    assert response.status_code == 200

    # Verify deleted (Get by ID)
    get_res = await client.get(
        f"/api/v1/catalog/products/{prod_id}",
        headers=superuser_token_headers
    )
    assert get_res.status_code == 404
