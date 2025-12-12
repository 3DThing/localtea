/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArticleAdminResponse } from '../models/ArticleAdminResponse';
import type { ArticleCreate } from '../models/ArticleCreate';
import type { ArticleListResponse } from '../models/ArticleListResponse';
import type { ArticleUpdate } from '../models/ArticleUpdate';
import type { Body_upload_blog_image_api_v1_blog_upload_image_post } from '../models/Body_upload_blog_image_api_v1_blog_upload_image_post';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BlogService {
    /**
     * Read Articles
     * Получить список статей с пагинацией.
     *
     * - **skip**: количество пропускаемых записей (для пагинации)
     * - **limit**: максимальное количество записей
     * - **search**: поиск по заголовку
     * - **is_published**: фильтр по статусу публикации (true/false)
     * @param skip
     * @param limit
     * @param search
     * @param isPublished
     * @returns ArticleListResponse Successful Response
     * @throws ApiError
     */
    public static readArticlesApiV1BlogGet(
        skip?: number,
        limit: number = 100,
        search?: (string | null),
        isPublished?: (boolean | null),
    ): CancelablePromise<ArticleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/blog/',
            query: {
                'skip': skip,
                'limit': limit,
                'search': search,
                'is_published': isPublished,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Article
     * Создать новую статью.
     *
     * Автором статьи автоматически становится текущий администратор.
     * @param requestBody
     * @returns ArticleAdminResponse Successful Response
     * @throws ApiError
     */
    public static createArticleApiV1BlogPost(
        requestBody: ArticleCreate,
    ): CancelablePromise<ArticleAdminResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/blog/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Article
     * Получить статью по ID
     * @param id
     * @returns ArticleAdminResponse Successful Response
     * @throws ApiError
     */
    public static readArticleApiV1BlogIdGet(
        id: number,
    ): CancelablePromise<ArticleAdminResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/blog/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Article
     * Обновить статью
     * @param id
     * @param requestBody
     * @returns ArticleAdminResponse Successful Response
     * @throws ApiError
     */
    public static updateArticleApiV1BlogIdPatch(
        id: number,
        requestBody: ArticleUpdate,
    ): CancelablePromise<ArticleAdminResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/blog/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Article
     * Удалить статью
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteArticleApiV1BlogIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/blog/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Publish Article
     * Опубликовать статью
     * @param id
     * @returns ArticleAdminResponse Successful Response
     * @throws ApiError
     */
    public static publishArticleApiV1BlogIdPublishPost(
        id: number,
    ): CancelablePromise<ArticleAdminResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/blog/{id}/publish',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unpublish Article
     * Снять статью с публикации
     * @param id
     * @returns ArticleAdminResponse Successful Response
     * @throws ApiError
     */
    public static unpublishArticleApiV1BlogIdUnpublishPost(
        id: number,
    ): CancelablePromise<ArticleAdminResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/blog/{id}/unpublish',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Blog Image
     * Загрузить изображение для статьи блога.
     *
     * Можно использовать для загрузки обложки или изображений внутри контента.
     * Изображение автоматически конвертируется в WebP.
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadBlogImageApiV1BlogUploadImagePost(
        formData: Body_upload_blog_image_api_v1_blog_upload_image_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/blog/upload-image',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
