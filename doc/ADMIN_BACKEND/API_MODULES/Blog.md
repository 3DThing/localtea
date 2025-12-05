# Модуль Blog (Admin)

Управление статьями блога платформы LocalTea.

## Описание

Модуль предоставляет полный CRUD для статей блога с поддержкой:
- Создание и редактирование статей с HTML/Markdown контентом
- Загрузка изображений (обложки и контента)
- Публикация и снятие с публикации
- Автоматическое конвертирование изображений в WebP

## Эндпоинты

### `GET /api/v1/blog/`
Получение списка статей с пагинацией и фильтрацией.

**Параметры запроса:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `skip` | int | Нет | Пропуск записей (default: 0) |
| `limit` | int | Нет | Максимум записей (default: 100) |
| `search` | string | Нет | Поиск по заголовку |
| `is_published` | bool | Нет | Фильтр по статусу публикации |

**Ответ:** `ArticleListResponse`
```json
{
  "items": [
    {
      "id": 1,
      "title": "Как заваривать пуэр",
      "slug": "kak-zavarivat-puer",
      "content": "<p>Содержание статьи...</p>",
      "preview_image": "/uploads/blog/image.webp",
      "is_published": true,
      "created_at": "2024-01-15T10:30:00Z",
      "author_id": 1,
      "author": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com"
      },
      "views_count": 150,
      "likes_count": 12,
      "comments_count": 5
    }
  ],
  "total": 42
}
```

---

### `GET /api/v1/blog/{id}`
Получение статьи по ID.

**Параметры пути:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `id` | int | ID статьи |

**Ответ:** `ArticleAdminResponse`

**Ошибки:**
- `404 Not Found` — Статья не найдена

---

### `POST /api/v1/blog/`
Создание новой статьи.

**Тело запроса:** `ArticleCreate`
```json
{
  "title": "Как заваривать пуэр",
  "slug": "kak-zavarivat-puer",
  "content": "<p>Содержание статьи...</p>",
  "preview_image": "/uploads/blog/image.webp",
  "is_published": false
}
```

| Поле | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `title` | string | Да | Заголовок статьи (1-255 символов) |
| `slug` | string | Да | URL-slug (уникальный) |
| `content` | string | Да | HTML контент статьи |
| `preview_image` | string | Нет | URL обложки |
| `is_published` | bool | Нет | Опубликовать сразу (default: false) |

**Ответ:** Созданный объект `ArticleAdminResponse`

**Ошибки:**
- `400 Bad Request` — Статья с таким slug уже существует

---

### `PATCH /api/v1/blog/{id}`
Обновление статьи.

**Тело запроса:** `ArticleUpdate` (все поля опциональны)
```json
{
  "title": "Новый заголовок",
  "content": "<p>Обновленный контент</p>"
}
```

**Ответ:** Обновленный объект `ArticleAdminResponse`

**Ошибки:**
- `404 Not Found` — Статья не найдена
- `400 Bad Request` — Статья с таким slug уже существует

---

### `DELETE /api/v1/blog/{id}`
Удаление статьи.

**Ответ:**
```json
{
  "message": "Статья удалена"
}
```

**Ошибки:**
- `404 Not Found` — Статья не найдена

---

### `POST /api/v1/blog/{id}/publish`
Опубликовать статью (установить `is_published = true`).

**Ответ:** `ArticleAdminResponse`

---

### `POST /api/v1/blog/{id}/unpublish`
Снять статью с публикации (установить `is_published = false`).

**Ответ:** `ArticleAdminResponse`

---

### `POST /api/v1/blog/upload-image`
Загрузка изображения для статьи.

**Формат:** `multipart/form-data`

| Поле | Тип | Описание |
|------|-----|----------|
| `file` | file | Файл изображения |

**Обработка:**
- Изображение конвертируется в формат WebP
- Создается миниатюра (thumbnail)
- Сохраняется в `/uploads/blog/`

**Ответ:**
```json
{
  "url": "/uploads/blog/abc123.webp"
}
```

## Схемы данных

### ArticleCreate
```python
class ArticleCreate(BaseModel):
    title: str           # Заголовок (1-255 символов)
    slug: str            # URL-slug (уникальный)
    content: str         # HTML контент
    preview_image: str?  # URL обложки
    is_published: bool   # Статус публикации (default: False)
```

### ArticleUpdate
```python
class ArticleUpdate(BaseModel):
    title: str?
    slug: str?
    content: str?
    preview_image: str?
    is_published: bool?
```

### ArticleAdminResponse
```python
class ArticleAdminResponse(BaseModel):
    id: int
    title: str
    slug: str
    content: str
    preview_image: str?
    is_published: bool
    created_at: datetime
    author_id: int?
    author: ArticleAuthor?
    views_count: int
    likes_count: int
    comments_count: int
```

## Аудит

Все операции создания, обновления и удаления статей логируются в `admin_action_log`:
- `article.create` — Создание статьи
- `article.update` — Обновление статьи
- `article.delete` — Удаление статьи
- `article.publish` — Публикация
- `article.unpublish` — Снятие с публикации

## Рекомендации по использованию

### Создание статьи с изображением
1. Загрузить обложку через `POST /api/v1/blog/upload-image`
2. Получить URL изображения из ответа
3. Создать статью через `POST /api/v1/blog/` с `preview_image`

### Загрузка изображений в контент
При использовании Rich Text Editor (TipTap), изображения внутри статьи загружаются через `POST /api/v1/blog/upload-image` и вставляются в HTML.

### Slug
Slug должен быть уникальным и содержать только латинские буквы, цифры и дефисы. Рекомендуется генерировать из заголовка с транслитерацией.
