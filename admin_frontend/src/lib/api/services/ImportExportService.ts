/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_products_api_v1_import_export_products_import_post } from '../models/Body_import_products_api_v1_import_export_products_import_post';
import type { ExportFormat } from '../models/ExportFormat';
import type { ImportResult } from '../models/ImportResult';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ImportExportService {
    /**
     * Export Products
     * Export products to CSV or JSON.
     *
     * - **format**: csv or json
     * - **category_id**: Filter by category
     * - **include_skus**: Include SKU data in export
     * @param format
     * @param categoryId
     * @param includeSkus
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportProductsApiV1ImportExportProductsExportGet(
        format: ExportFormat = 'csv',
        categoryId?: (number | null),
        includeSkus: boolean = true,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/import-export/products/export',
            query: {
                'format': format,
                'category_id': categoryId,
                'include_skus': includeSkus,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Export Categories
     * Export categories to CSV or JSON.
     * @param format
     * @returns any Successful Response
     * @throws ApiError
     */
    public static exportCategoriesApiV1ImportExportCategoriesExportGet(
        format: ExportFormat = 'csv',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/import-export/categories/export',
            query: {
                'format': format,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Products
     * Import products from CSV file.
     *
     * CSV columns: name, slug, category_name, description, is_active,
     * sku_code, weight_grams, price_cents, discount_cents, stock_quantity
     *
     * - **update_existing**: Update products if slug already exists
     * - **skip_errors**: Continue on row errors
     * @param formData
     * @param updateExisting
     * @param skipErrors
     * @returns ImportResult Successful Response
     * @throws ApiError
     */
    public static importProductsApiV1ImportExportProductsImportPost(
        formData: Body_import_products_api_v1_import_export_products_import_post,
        updateExisting: boolean = true,
        skipErrors: boolean = true,
    ): CancelablePromise<ImportResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/import-export/products/import',
            query: {
                'update_existing': updateExisting,
                'skip_errors': skipErrors,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Download Product Template
     * Download CSV template for product import.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadProductTemplateApiV1ImportExportTemplateProductsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/import-export/template/products',
        });
    }
    /**
     * Download Category Template
     * Download CSV template for category import.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static downloadCategoryTemplateApiV1ImportExportTemplateCategoriesGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/import-export/template/categories',
        });
    }
}
