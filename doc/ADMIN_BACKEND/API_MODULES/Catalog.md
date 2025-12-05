# Модуль Catalog (Admin)

Полное управление каталогом товаров: категории, товары, SKU и изображения.

## Categories

### `GET /api/v1/catalog/categories`
Получение списка всех категорий.
*   **Ответ**: Список объектов `Category`.

### `POST /api/v1/catalog/categories`
Создание новой категории.
*   **Тело запроса**: `CategoryCreate`
    *   `name` (str, required)
    *   `slug` (str, required, unique)
    *   `description` (str, optional)
    *   `parent_id` (int, optional)
    *   `seo_title` (str, optional)
    *   `seo_description` (str, optional)
    *   `is_active` (bool, default=True)
*   **Ответ**: Созданный объект `Category`.

### `PATCH /api/v1/catalog/categories/{id}`
Обновление категории.
*   **Тело запроса**: `CategoryUpdate` (все поля опциональны).
*   **Ответ**: Обновленный объект `Category`.

### `DELETE /api/v1/catalog/categories/{id}`
Удаление категории.

## Products

### `GET /api/v1/catalog/products`
Получение списка товаров.
*   **Параметры**: `skip`, `limit`.
*   **Ответ**: Список объектов `Product` (включая вложенные `skus` и `images`).

### `GET /api/v1/catalog/products/{id}`
Получение товара по ID.
*   **Ответ**: Объект `Product`.

### `POST /api/v1/catalog/products`
Создание товара.
*   **Тело запроса**: `ProductCreate`
    *   `title` (str, required)
    *   `slug` (str, required, unique)
    *   `category_id` (int, required)
    *   `tea_type` (str, optional)
    *   `description` (str, optional)
    *   `lore_description` (str, optional)
    *   `brewing_guide` (dict, optional)
    *   `is_active` (bool, default=True)
    *   `seo_title`, `seo_description`, `seo_keywords` (str, optional)
*   **Ответ**: Созданный объект `Product`.
*   **Ошибки**: `400 Bad Request` если указана несуществующая категория.

### `PATCH /api/v1/catalog/products/{id}`
Обновление товара.
*   **Тело запроса**: `ProductUpdate` (все поля опциональны).
*   **Ответ**: Обновленный объект `Product`.

### `DELETE /api/v1/catalog/products/{id}`
Удаление товара.

## SKU (Stock Keeping Units)

Управление конкретными вариациями товара (например, "Зеленый чай 50г", "Зеленый чай 100г").

### `POST /api/v1/catalog/products/{product_id}/skus`
Добавление SKU к товару.
*   **Тело запроса**: `SKUCreate`
    *   `sku_code` (str, required)
    *   `weight` (int, required)
    *   `price_cents` (int, required)
    *   `quantity` (int, required)
    *   `discount_cents` (int, optional)
    *   `is_active`, `is_visible`, `is_limited` (bool, optional)

### `PATCH /api/v1/catalog/skus/{id}`
Обновление SKU.
*   **Тело запроса**: `SKUUpdate`.

### `DELETE /api/v1/catalog/skus/{id}`
Удаление SKU.

## Images

### `POST /api/v1/catalog/products/{product_id}/images`
Загрузка изображения для товара.

*   **Формат**: `multipart/form-data`.
*   **Обработка**:
    *   Файл конвертируется в формат **WebP**.
    *   Создается миниатюра (thumbnail).
    *   Оригинал ресайзится до макс. 800x800px.
    *   Файлы сохраняются в папку `uploads/`.

### `DELETE /api/v1/catalog/images/{id}`
Удаление изображения.
