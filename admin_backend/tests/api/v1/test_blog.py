import pytest
import pytest_asyncio
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestBlogCRUD:
    """Тесты CRUD операций для статей блога"""

    async def test_create_article(self, client: AsyncClient, superuser_token_headers):
        """Создание статьи"""
        response = await client.post(
            "/api/v1/blog/",
            json={
                "title": "Как заваривать пуэр",
                "slug": "kak-zavarivat-puer",
                "content": "<p>Содержание статьи о пуэре...</p>",
                "is_published": False,
            },
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Как заваривать пуэр"
        assert data["slug"] == "kak-zavarivat-puer"
        assert data["is_published"] is False
        assert data["id"] is not None

    async def test_create_article_duplicate_slug(self, client: AsyncClient, superuser_token_headers):
        """Создание статьи с дубликатом slug должно вернуть ошибку"""
        # Создаем первую статью
        await client.post(
            "/api/v1/blog/",
            json={
                "title": "Статья 1",
                "slug": "unique-slug",
                "content": "<p>Текст</p>",
            },
            headers=superuser_token_headers,
        )
        
        # Пытаемся создать вторую с тем же slug
        response = await client.post(
            "/api/v1/blog/",
            json={
                "title": "Статья 2",
                "slug": "unique-slug",
                "content": "<p>Другой текст</p>",
            },
            headers=superuser_token_headers,
        )
        assert response.status_code == 400
        assert "slug" in response.json()["detail"].lower()

    async def test_get_articles_list(self, client: AsyncClient, superuser_token_headers):
        """Получение списка статей"""
        # Создаем несколько статей
        for i in range(3):
            await client.post(
                "/api/v1/blog/",
                json={
                    "title": f"Статья {i}",
                    "slug": f"statya-{i}",
                    "content": f"<p>Текст {i}</p>",
                },
                headers=superuser_token_headers,
            )
        
        response = await client.get("/api/v1/blog/", headers=superuser_token_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    async def test_get_articles_with_search(self, client: AsyncClient, superuser_token_headers):
        """Поиск статей по заголовку"""
        await client.post(
            "/api/v1/blog/",
            json={"title": "Зеленый чай", "slug": "green-tea", "content": "<p>О зеленом чае</p>"},
            headers=superuser_token_headers,
        )
        await client.post(
            "/api/v1/blog/",
            json={"title": "Черный чай", "slug": "black-tea", "content": "<p>О черном чае</p>"},
            headers=superuser_token_headers,
        )
        
        response = await client.get(
            "/api/v1/blog/",
            params={"search": "зеленый"},
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Зеленый чай"

    async def test_get_articles_filter_published(self, client: AsyncClient, superuser_token_headers):
        """Фильтрация по статусу публикации"""
        await client.post(
            "/api/v1/blog/",
            json={"title": "Опубликованная", "slug": "published", "content": "<p>Текст</p>", "is_published": True},
            headers=superuser_token_headers,
        )
        await client.post(
            "/api/v1/blog/",
            json={"title": "Черновик", "slug": "draft", "content": "<p>Текст</p>", "is_published": False},
            headers=superuser_token_headers,
        )
        
        # Только опубликованные
        response = await client.get(
            "/api/v1/blog/",
            params={"is_published": True},
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Опубликованная"
        
        # Только черновики
        response = await client.get(
            "/api/v1/blog/",
            params={"is_published": False},
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Черновик"

    async def test_get_article_by_id(self, client: AsyncClient, superuser_token_headers):
        """Получение статьи по ID"""
        create_response = await client.post(
            "/api/v1/blog/",
            json={"title": "Тестовая статья", "slug": "test-article", "content": "<p>Текст</p>"},
            headers=superuser_token_headers,
        )
        article_id = create_response.json()["id"]
        
        response = await client.get(f"/api/v1/blog/{article_id}", headers=superuser_token_headers)
        assert response.status_code == 200
        assert response.json()["id"] == article_id
        assert response.json()["title"] == "Тестовая статья"

    async def test_get_article_not_found(self, client: AsyncClient, superuser_token_headers):
        """Получение несуществующей статьи"""
        response = await client.get("/api/v1/blog/99999", headers=superuser_token_headers)
        assert response.status_code == 404

    async def test_update_article(self, client: AsyncClient, superuser_token_headers):
        """Обновление статьи"""
        create_response = await client.post(
            "/api/v1/blog/",
            json={"title": "Старый заголовок", "slug": "old-slug", "content": "<p>Старый текст</p>"},
            headers=superuser_token_headers,
        )
        article_id = create_response.json()["id"]
        
        response = await client.patch(
            f"/api/v1/blog/{article_id}",
            json={"title": "Новый заголовок", "content": "<p>Новый текст</p>"},
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Новый заголовок"
        assert data["content"] == "<p>Новый текст</p>"
        assert data["slug"] == "old-slug"  # Slug не изменился

    async def test_delete_article(self, client: AsyncClient, superuser_token_headers):
        """Удаление статьи"""
        create_response = await client.post(
            "/api/v1/blog/",
            json={"title": "Удаляемая", "slug": "to-delete", "content": "<p>Текст</p>"},
            headers=superuser_token_headers,
        )
        article_id = create_response.json()["id"]
        
        response = await client.delete(f"/api/v1/blog/{article_id}", headers=superuser_token_headers)
        assert response.status_code == 200
        
        # Проверяем, что статья удалена
        get_response = await client.get(f"/api/v1/blog/{article_id}", headers=superuser_token_headers)
        assert get_response.status_code == 404


class TestBlogPublish:
    """Тесты публикации статей"""

    async def test_publish_article(self, client: AsyncClient, superuser_token_headers):
        """Публикация статьи"""
        create_response = await client.post(
            "/api/v1/blog/",
            json={"title": "Статья", "slug": "article", "content": "<p>Текст</p>", "is_published": False},
            headers=superuser_token_headers,
        )
        article_id = create_response.json()["id"]
        assert create_response.json()["is_published"] is False
        
        response = await client.post(f"/api/v1/blog/{article_id}/publish", headers=superuser_token_headers)
        assert response.status_code == 200
        assert response.json()["is_published"] is True

    async def test_unpublish_article(self, client: AsyncClient, superuser_token_headers):
        """Снятие статьи с публикации"""
        create_response = await client.post(
            "/api/v1/blog/",
            json={"title": "Статья", "slug": "article", "content": "<p>Текст</p>", "is_published": True},
            headers=superuser_token_headers,
        )
        article_id = create_response.json()["id"]
        assert create_response.json()["is_published"] is True
        
        response = await client.post(f"/api/v1/blog/{article_id}/unpublish", headers=superuser_token_headers)
        assert response.status_code == 200
        assert response.json()["is_published"] is False


class TestBlogAuth:
    """Тесты авторизации для Blog API"""

    async def test_list_articles_unauthorized(self, client: AsyncClient):
        """Список статей без авторизации"""
        response = await client.get("/api/v1/blog/")
        assert response.status_code == 401

    async def test_create_article_unauthorized(self, client: AsyncClient):
        """Создание статьи без авторизации"""
        response = await client.post(
            "/api/v1/blog/",
            json={"title": "Статья", "slug": "article", "content": "<p>Текст</p>"},
        )
        assert response.status_code == 401
