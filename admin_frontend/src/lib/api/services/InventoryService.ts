/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BulkInventoryUpdate } from '../models/BulkInventoryUpdate';
import type { InventoryListResponse } from '../models/InventoryListResponse';
import type { InventorySummary } from '../models/InventorySummary';
import type { SKUInventoryUpdate } from '../models/SKUInventoryUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InventoryService {
    /**
     * List Inventory
     * List inventory with filters.
     *
     * - **product_id**: Filter by product
     * - **low_stock_only**: Only SKUs with stock <= threshold
     * - **out_of_stock_only**: Only SKUs with stock = 0
     * - **q**: Search in product name or SKU code
     * @param skip
     * @param limit
     * @param productId
     * @param lowStockOnly
     * @param outOfStockOnly
     * @param q
     * @returns InventoryListResponse Successful Response
     * @throws ApiError
     */
    public static listInventoryApiV1InventoryGet(
        skip?: number,
        limit: number = 50,
        productId?: (number | null),
        lowStockOnly: boolean = false,
        outOfStockOnly: boolean = false,
        q?: (string | null),
    ): CancelablePromise<InventoryListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory',
            query: {
                'skip': skip,
                'limit': limit,
                'product_id': productId,
                'low_stock_only': lowStockOnly,
                'out_of_stock_only': outOfStockOnly,
                'q': q,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Inventory Summary
     * Get inventory summary statistics.
     * @returns InventorySummary Successful Response
     * @throws ApiError
     */
    public static getInventorySummaryApiV1InventorySummaryGet(): CancelablePromise<InventorySummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory/summary',
        });
    }
    /**
     * Update Sku Stock
     * Update stock quantity for a single SKU.
     * @param skuId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static updateSkuStockApiV1InventorySkuIdPatch(
        skuId: number,
        requestBody: SKUInventoryUpdate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/inventory/{sku_id}',
            path: {
                'sku_id': skuId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Update Stock
     * Bulk update stock for multiple SKUs.
     *
     * Useful for inventory reconciliation or restocking.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkUpdateStockApiV1InventoryBulkUpdatePost(
        requestBody: BulkInventoryUpdate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inventory/bulk-update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Adjust Stock
     * Adjust stock by a relative amount.
     *
     * - Positive quantity: Add to stock
     * - Negative quantity: Remove from stock
     * @param skuId
     * @param quantityChange Positive to add, negative to subtract
     * @param reason
     * @returns any Successful Response
     * @throws ApiError
     */
    public static adjustStockApiV1InventorySkuIdAdjustPost(
        skuId: number,
        quantityChange: number,
        reason?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inventory/{sku_id}/adjust',
            path: {
                'sku_id': skuId,
            },
            query: {
                'quantity_change': quantityChange,
                'reason': reason,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
