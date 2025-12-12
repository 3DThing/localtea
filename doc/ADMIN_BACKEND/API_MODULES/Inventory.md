# Модуль Inventory (Admin)

Управление складом: категории материалов, материалы, остатки товаров, история движений.
Базовый префикс для всех маршрутов: `/api/v1/inventory`.

## Категории материалов

### `GET /categories`

*   **Описание**: Список категорий материалов.
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `skip` (int, default=0): Пропустить N записей.
    *   `limit` (int, default=100, max=500): Лимит записей.
    *   `is_active` (bool, optional): Фильтр по активности.
    *   `q` (string, optional): Поиск по названию.
*   **Ответ**: `InventoryCategoryListResponse`.

### `POST /categories`

*   **Описание**: Создать категорию материалов.
*   **Требования**: Права администратора.
*   **Тело запроса**: `InventoryCategoryCreate`
    *   `name` (string, required): Название.
    *   `description` (string, optional): Описание.
    *   `is_active` (bool, default=true): Активность.
    *   `sort_order` (int, default=0): Порядок сортировки.
*   **Ответ**: Созданный объект категории.

### `PATCH /categories/{category_id}`

*   **Описание**: Обновить категорию.
*   **Требования**: Права администратора.
*   **Параметры**: `category_id` (Integer).
*   **Ответ**: Обновлённый объект категории.

### `DELETE /categories/{category_id}`

*   **Описание**: Удалить категорию.
*   **Требования**: Права администратора.
*   **Условия**: Категория не должна содержать материалов.
*   **Ответ**: `{"message": "Category deleted"}`.

---

## Материалы (сырьё)

### `GET /materials`

*   **Описание**: Список материалов на складе.
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `skip` (int, default=0): Пропустить N записей.
    *   `limit` (int, default=50, max=200): Лимит записей.
    *   `category_id` (int, optional): Фильтр по категории.
    *   `is_active` (bool, optional): Фильтр по активности.
    *   `low_stock` (bool, optional): Только с низким остатком.
    *   `q` (string, optional): Поиск по названию/артикулу.
*   **Ответ**: `InventoryMaterialListResponse`.

### `GET /materials/{material_id}`

*   **Описание**: Получить материал по ID.
*   **Требования**: Права администратора.
*   **Ответ**: Объект `InventoryMaterialResponse`.

### `POST /materials`

*   **Описание**: Создать материал.
*   **Требования**: Права администратора.
*   **Тело запроса**: `InventoryMaterialCreate`
    *   `name` (string, required): Название.
    *   `sku` (string, optional): Артикул.
    *   `category_id` (int, optional): ID категории.
    *   `description` (string, optional): Описание.
    *   `unit` (string, default="шт"): Единица измерения.
    *   `quantity` (float, default=0): Начальное количество.
    *   `min_quantity` (float, optional): Минимальный остаток (для уведомлений).
    *   `cost_per_unit_cents` (int, optional): Стоимость за единицу.
    *   `is_active` (bool, default=true): Активность.
*   **Ответ**: Созданный объект материала.

### `PATCH /materials/{material_id}`

*   **Описание**: Обновить материал (не количество!).
*   **Требования**: Права администратора.
*   **Параметры**: `material_id` (Integer).
*   **Ответ**: Обновлённый объект материала.

### `DELETE /materials/{material_id}`

*   **Описание**: Удалить материал.
*   **Требования**: Права администратора.
*   **Ответ**: `{"message": "Material deleted"}`.

### `POST /materials/{material_id}/adjust`

*   **Описание**: Корректировка остатка материала.
*   **Требования**: Права администратора.
*   **Параметры**: `material_id` (Integer).
*   **Тело запроса**: `StockAdjustment`
    *   `quantity_change` (float): Изменение количества (+ или -).
    *   `reason` (string, required): Причина корректировки.
    *   `movement_type` (string, optional): Тип движения.
*   **Действия**:
    *   Обновляет остаток.
    *   Создаёт запись в истории движений.
*   **Ответ**: Обновлённый объект материала.

---

## Остатки товаров (SKU)

### `GET /products`

*   **Описание**: Список остатков товаров (по SKU).
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `skip` (int, default=0): Пропустить N записей.
    *   `limit` (int, default=50, max=200): Лимит записей.
    *   `product_id` (int, optional): Фильтр по товару.
    *   `low_stock` (bool, optional): Только с низким остатком.
    *   `q` (string, optional): Поиск по названию товара.
*   **Ответ**: `ProductStockListResponse`.

### `POST /products/{sku_id}/adjust`

*   **Описание**: Корректировка остатка SKU.
*   **Требования**: Права администратора.
*   **Параметры**: `sku_id` (Integer).
*   **Тело запроса**: `StockAdjustment`
    *   `quantity_change` (int): Изменение количества.
    *   `reason` (string, required): Причина.
    *   `movement_type` (string, optional): Тип движения.
*   **Ответ**: Обновлённый объект SKU с остатками.

---

## История движений

### `GET /movements`

*   **Описание**: История движений на складе.
*   **Требования**: Права администратора.
*   **Параметры запроса**:
    *   `skip` (int, default=0): Пропустить N записей.
    *   `limit` (int, default=50, max=200): Лимит записей.
    *   `material_id` (int, optional): Фильтр по материалу.
    *   `sku_id` (int, optional): Фильтр по SKU.
    *   `movement_type` (string, optional): Тип движения.
    *   `date_from` (datetime, optional): Дата начала периода.
    *   `date_to` (datetime, optional): Дата конца периода.
*   **Ответ**: `MovementListResponse`.

---

## Аналитика

### `GET /analytics`

*   **Описание**: Аналитика по складу.
*   **Требования**: Права администратора.
*   **Ответ**: `InventoryAnalytics`
    *   `total_materials` (int): Всего материалов.
    *   `total_products_sku` (int): Всего SKU товаров.
    *   `low_stock_materials` (int): Материалов с низким остатком.
    *   `low_stock_products` (int): SKU с низким остатком.
    *   `total_inventory_value_cents` (int): Общая стоимость склада.
    *   `recent_movements` (array): Последние 10 движений.

---

## Устаревшие эндпоинты (Legacy)

### `GET /`

*   **Описание**: Список остатков SKU (legacy).
*   **Примечание**: Используйте `GET /products` вместо этого.

### `GET /summary`

*   **Описание**: Сводка по складу (legacy).
*   **Примечание**: Используйте `GET /analytics` вместо этого.

---

## Типы движений (MovementType)

| Тип | Описание |
|-----|----------|
| `receipt` | Поступление |
| `sale` | Продажа |
| `return` | Возврат |
| `adjustment` | Корректировка |
| `write_off` | Списание |
| `transfer` | Перемещение |
