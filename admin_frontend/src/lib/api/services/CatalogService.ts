/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_upload_category_image_api_v1_catalog_categories_image_post } from '../models/Body_upload_category_image_api_v1_catalog_categories_image_post';
import type { Body_upload_product_image_api_v1_catalog_products__product_id__images_post } from '../models/Body_upload_product_image_api_v1_catalog_products__product_id__images_post';
import type { Category } from '../models/Category';
import type { CategoryCreate } from '../models/CategoryCreate';
import type { CategoryUpdate } from '../models/CategoryUpdate';
import type { Product } from '../models/Product';
import type { ProductCreate } from '../models/ProductCreate';
import type { ProductUpdate } from '../models/ProductUpdate';
import type { SKUCreate } from '../models/SKUCreate';
import type { SKUUpdate } from '../models/SKUUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CatalogService {
    /**
     * Read Categories
     * @returns Category Successful Response
     * @throws ApiError
     */
    public static readCategoriesApiV1CatalogCategoriesGet(): CancelablePromise<Array<Category>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/catalog/categories',
        });
    }
    /**
     * Create Category
     * @param requestBody
     * @returns Category Successful Response
     * @throws ApiError
     */
    public static createCategoryApiV1CatalogCategoriesPost(
        requestBody: CategoryCreate,
    ): CancelablePromise<Category> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/catalog/categories',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Category
     * @param id
     * @param requestBody
     * @returns Category Successful Response
     * @throws ApiError
     */
    public static updateCategoryApiV1CatalogCategoriesIdPatch(
        id: number,
        requestBody: CategoryUpdate,
    ): CancelablePromise<Category> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/catalog/categories/{id}',
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
     * Delete Category
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteCategoryApiV1CatalogCategoriesIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/catalog/categories/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Category Image
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadCategoryImageApiV1CatalogCategoriesImagePost(
        formData: Body_upload_category_image_api_v1_catalog_categories_image_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/catalog/categories/image',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Products
     * @param skip
     * @param limit
     * @returns Product Successful Response
     * @throws ApiError
     */
    public static readProductsApiV1CatalogProductsGet(
        skip?: number,
        limit: number = 100,
    ): CancelablePromise<Array<Product>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/catalog/products',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Product
     * @param requestBody
     * @returns Product Successful Response
     * @throws ApiError
     */
    public static createProductApiV1CatalogProductsPost(
        requestBody: ProductCreate,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/catalog/products',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Product
     * @param id
     * @returns Product Successful Response
     * @throws ApiError
     */
    public static readProductApiV1CatalogProductsIdGet(
        id: number,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/catalog/products/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Product
     * @param id
     * @param requestBody
     * @returns Product Successful Response
     * @throws ApiError
     */
    public static updateProductApiV1CatalogProductsIdPatch(
        id: number,
        requestBody: ProductUpdate,
    ): CancelablePromise<Product> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/catalog/products/{id}',
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
     * Delete Product
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteProductApiV1CatalogProductsIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/catalog/products/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Sku
     * @param productId
     * @param requestBody
     * @returns SKUUpdate Successful Response
     * @throws ApiError
     */
    public static createSkuApiV1CatalogProductsProductIdSkusPost(
        productId: number,
        requestBody: SKUCreate,
    ): CancelablePromise<SKUUpdate> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/catalog/products/{product_id}/skus',
            path: {
                'product_id': productId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Sku
     * @param id
     * @param requestBody
     * @returns SKUUpdate Successful Response
     * @throws ApiError
     */
    public static updateSkuApiV1CatalogSkusIdPatch(
        id: number,
        requestBody: SKUUpdate,
    ): CancelablePromise<SKUUpdate> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/catalog/skus/{id}',
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
     * Delete Sku
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteSkuApiV1CatalogSkusIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/catalog/skus/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Product Image
     * @param productId
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadProductImageApiV1CatalogProductsProductIdImagesPost(
        productId: number,
        formData: Body_upload_product_image_api_v1_catalog_products__product_id__images_post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/catalog/products/{product_id}/images',
            path: {
                'product_id': productId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Image
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteImageApiV1CatalogImagesIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/catalog/images/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
