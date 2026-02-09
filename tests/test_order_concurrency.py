import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from backend.main import app
from backend.db.base import Base
from backend.dependencies.deps import get_db
from backend.models.catalog import Category, Product, SKU
from backend.models.inventory import ProductStock
from backend.models.user import User


@pytest.mark.asyncio
async def test_concurrent_checkout_single_stock(db_engine):
    """Two users checkout the same SKU with quantity=1.

    Expected behavior: one succeeds, one fails with 'Not enough stock', and SKU stock
    ends at quantity=0, reserved_quantity=1.
    """

    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def override_get_db():
        async with async_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Seed catalog with a single-stock SKU
            async with async_session_factory() as session:
                category = Category(name="Tea", slug="tea-concurrency", description="Tea")
                session.add(category)
                await session.flush()

                product = Product(
                    title="Concurrency Tea",
                    slug="concurrency-tea",
                    category_id=category.id,
                    description="Test product",
                )
                session.add(product)
                await session.flush()

                sku = SKU(
                    product_id=product.id,
                    sku_code="CONC-1",
                    weight=100,
                    price_cents=1000,
                    quantity=1,
                    is_active=True,
                )
                session.add(sku)
                await session.flush()

                # Keep ProductStock in sync (order service updates it too)
                session.add(ProductStock(sku_id=sku.id, quantity=1, reserved=0))

                await session.commit()
                sku_id = sku.id

            async def register_confirm_login(email: str, username: str):
                user_data = {
                    "email": email,
                    "username": username,
                    "password": "StrongPassword123!",
                    "firstname": "Test",
                    "lastname": "User",
                    "birthdate": "2000-01-01",
                }

                with patch("backend.worker.send_email.delay"):
                    resp = await client.post("/api/v1/user/registration", json=user_data)
                    assert resp.status_code == 200

                async with async_session_factory() as session:
                    result = await session.execute(select(User).where(User.email == email))
                    user = result.scalars().first()
                    assert user is not None
                    token = user.email_confirm_token

                confirm = await client.post(f"/api/v1/user/confirm-email?token={token}")
                assert confirm.status_code in (200, 204)

                login_resp = await client.post(
                    "/api/v1/user/login",
                    json={"email": email, "password": user_data["password"]},
                )
                assert login_resp.status_code == 200
                tokens = login_resp.json()
                access_token = tokens["access_token"]
                csrf_token = login_resp.cookies.get("csrf_token")

                return {
                    "Authorization": f"Bearer {access_token}",
                    "X-CSRF-Token": csrf_token,
                }

            headers_1 = await register_confirm_login("u1@example.com", "u1")
            headers_2 = await register_confirm_login("u2@example.com", "u2")

            # Each user adds the same SKU (qty=1) to their cart
            add_1 = await client.post(
                "/api/v1/cart/items",
                json={"sku_id": sku_id, "quantity": 1},
                headers=headers_1,
            )
            assert add_1.status_code == 200

            add_2 = await client.post(
                "/api/v1/cart/items",
                json={"sku_id": sku_id, "quantity": 1},
                headers=headers_2,
            )
            assert add_2.status_code == 200

            checkout_data = {
                "delivery_method": "pickup",
                "contact_info": {
                    "firstname": "Test",
                    "lastname": "User",
                    "email": "test@example.com",
                    "phone": "+79991234567",
                },
                "payment_method": "card",
            }

            start = asyncio.Event()

            async def do_checkout(headers):
                await start.wait()
                return await client.post(
                    "/api/v1/orders/checkout",
                    json=checkout_data,
                    headers=headers,
                )

            # Mock payment provider once for both concurrent requests
            with patch(
                "backend.services.payment.yookassa.YookassaPaymentService.create_payment"
            ) as mock_payment:
                mock_payment.return_value = {
                    "payment_id": "pay_concurrent",
                    "payment_url": "https://yookassa.ru/pay",
                    "status": "pending",
                }

                t1 = asyncio.create_task(do_checkout(headers_1))
                t2 = asyncio.create_task(do_checkout(headers_2))
                start.set()
                r1, r2 = await asyncio.gather(t1, t2)

            statuses = sorted([r1.status_code, r2.status_code])
            assert statuses == [200, 400]

            failed = r1 if r1.status_code != 200 else r2
            assert "Not enough stock" in failed.json()["detail"]

            async with async_session_factory() as session:
                sku = (
                    await session.execute(select(SKU).where(SKU.id == sku_id))
                ).scalars().first()
                assert sku is not None
                assert sku.quantity == 0
                assert sku.reserved_quantity == 1

    finally:
        app.dependency_overrides.clear()
        async with db_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
