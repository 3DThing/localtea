/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OrderAdminResponse } from '../models/OrderAdminResponse';
import type { OrderStatus } from '../models/OrderStatus';
import type { OrderStatusUpdate } from '../models/OrderStatusUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrdersService {
    /**
     * Read Orders
     * @param skip
     * @param limit
     * @param status
     * @returns OrderAdminResponse Successful Response
     * @throws ApiError
     */
    public static readOrdersApiV1OrdersGet(
        skip?: number,
        limit: number = 100,
        status?: (OrderStatus | null),
    ): CancelablePromise<Array<OrderAdminResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/orders/',
            query: {
                'skip': skip,
                'limit': limit,
                'status': status,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Order
     * @param id
     * @returns OrderAdminResponse Successful Response
     * @throws ApiError
     */
    public static readOrderApiV1OrdersIdGet(
        id: number,
    ): CancelablePromise<OrderAdminResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/orders/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Order Status
     * @param id
     * @param requestBody
     * @returns OrderAdminResponse Successful Response
     * @throws ApiError
     */
    public static updateOrderStatusApiV1OrdersIdStatusPatch(
        id: number,
        requestBody: OrderStatusUpdate,
    ): CancelablePromise<OrderAdminResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/orders/{id}/status',
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
     * Cancel Order
     * @param id
     * @returns OrderAdminResponse Successful Response
     * @throws ApiError
     */
    public static cancelOrderApiV1OrdersIdCancelPost(
        id: number,
    ): CancelablePromise<OrderAdminResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/orders/{id}/cancel',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
