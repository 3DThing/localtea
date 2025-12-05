from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from backend.db.session import get_db
from backend.models.user import User
from admin_backend.core.deps import get_current_admin
from admin_backend.crud import crud_blog
from admin_backend.schemas import blog as schemas
from admin_backend.services.image_service import process_and_save_image
from admin_backend.services.audit_log import log_admin_action

router = APIRouter()


@router.get("/", response_model=schemas.ArticleListResponse)
async def read_articles(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_published: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Получить список статей с пагинацией.
    
    - **skip**: количество пропускаемых записей (для пагинации)
    - **limit**: максимальное количество записей
    - **search**: поиск по заголовку
    - **is_published**: фильтр по статусу публикации (true/false)
    """
    articles, total = await crud_blog.article.get_multi_with_author(
        db, skip=skip, limit=limit, search=search, is_published=is_published
    )
    return schemas.ArticleListResponse(items=articles, total=total)


@router.get("/{id}", response_model=schemas.ArticleAdminResponse)
async def read_article(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Получить статью по ID"""
    article = await crud_blog.article.get_with_author(db, id=id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    return article


@router.post("/", response_model=schemas.ArticleAdminResponse)
async def create_article(
    article_in: schemas.ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Создать новую статью.
    
    Автором статьи автоматически становится текущий администратор.
    """
    # Проверка уникальности slug
    existing = await crud_blog.article.get_by_slug(db, slug=article_in.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Статья с таким slug уже существует")
    
    try:
        article = await crud_blog.article.create_with_author(
            db, obj_in=article_in, author_id=current_user.id
        )
    except IntegrityError:
        raise HTTPException(status_code=400, detail="Ошибка при создании статьи")
    
    # Загрузить с автором для ответа
    article = await crud_blog.article.get_with_author(db, id=article.id)
    
    await log_admin_action(
        db, current_user.id, "create", "article", article.id,
        f"Создана статья '{article.title}'"
    )
    return article


@router.patch("/{id}", response_model=schemas.ArticleAdminResponse)
async def update_article(
    id: int,
    article_in: schemas.ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Обновить статью"""
    article = await crud_blog.article.get(db, id=id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    
    # Проверка уникальности slug при изменении
    if article_in.slug and article_in.slug != article.slug:
        existing = await crud_blog.article.get_by_slug(db, slug=article_in.slug)
        if existing:
            raise HTTPException(status_code=400, detail="Статья с таким slug уже существует")
    
    article = await crud_blog.article.update(db, db_obj=article, obj_in=article_in)
    article = await crud_blog.article.get_with_author(db, id=article.id)
    
    await log_admin_action(
        db, current_user.id, "update", "article", article.id,
        f"Обновлена статья '{article.title}'"
    )
    return article


@router.delete("/{id}")
async def delete_article(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Удалить статью"""
    article = await crud_blog.article.get(db, id=id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    
    title = article.title
    await db.delete(article)
    await db.commit()
    
    await log_admin_action(
        db, current_user.id, "delete", "article", id,
        f"Удалена статья '{title}'"
    )
    return {"message": "Статья удалена"}


@router.post("/{id}/publish", response_model=schemas.ArticleAdminResponse)
async def publish_article(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Опубликовать статью"""
    article = await crud_blog.article.get(db, id=id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    
    article = await crud_blog.article.publish(db, db_obj=article)
    article = await crud_blog.article.get_with_author(db, id=article.id)
    
    await log_admin_action(
        db, current_user.id, "update", "article", article.id,
        f"Опубликована статья '{article.title}'"
    )
    return article


@router.post("/{id}/unpublish", response_model=schemas.ArticleAdminResponse)
async def unpublish_article(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Снять статью с публикации"""
    article = await crud_blog.article.get(db, id=id)
    if not article:
        raise HTTPException(status_code=404, detail="Статья не найдена")
    
    article = await crud_blog.article.unpublish(db, db_obj=article)
    article = await crud_blog.article.get_with_author(db, id=article.id)
    
    await log_admin_action(
        db, current_user.id, "update", "article", article.id,
        f"Снята с публикации статья '{article.title}'"
    )
    return article


@router.post("/upload-image")
async def upload_blog_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Загрузить изображение для статьи блога.
    
    Можно использовать для загрузки обложки или изображений внутри контента.
    Изображение автоматически конвертируется в WebP.
    """
    url = process_and_save_image(file, subfolder="blog")
    return {"url": url}
