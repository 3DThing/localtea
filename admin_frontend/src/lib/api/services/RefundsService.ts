/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OrderRefundInfo } from '../models/OrderRefundInfo';
import type { RefundCreate } from '../models/RefundCreate';
import type { RefundListResponse } from '../models/RefundListResponse';
import type { RefundResponse } from '../models/RefundResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RefundsService {
    /**
     * List Refunds
     * List all refunds.
     *
     * - **order_id**: Filter by order
     * - **status**: Filter by status (pending, succeeded, canceled)
     * @param skip
     * @param limit
     * @param orderId
     * @param status
     * @returns RefundListResponse Successful Response
     * @throws ApiError
     */
    public static listRefundsApiV1RefundsGet(
        skip?: number,
        limit: number = 50,
        orderId?: (number | null),
        status?: (string | null),
    ): CancelablePromise<RefundListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/refunds',
            query: {
                'skip': skip,
                'limit': limit,
                'order_id': orderId,
                'status': status,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Refund
     * Create a refund for an order.
     *
     * Initiates refund through YooKassa payment gateway.
     * @param requestBody
     * @returns RefundResponse Successful Response
     * @throws ApiError
     */
    public static createRefundApiV1RefundsPost(
        requestBody: RefundCreate,
    ): CancelablePromise<RefundResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/refunds',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Order Refund Info
     * Get refund information for an order.
     * @param orderId
     * @returns OrderRefundInfo Successful Response
     * @throws ApiError
     */
    public static getOrderRefundInfoApiV1RefundsOrderOrderIdGet(
        orderId: number,
    ): CancelablePromise<OrderRefundInfo> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/refunds/order/{order_id}',
            path: {
                'order_id': orderId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Check Refund Status
     * Check refund status from YooKassa.
     * @param refundId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static checkRefundStatusApiV1RefundsRefundIdStatusGet(
        refundId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/refunds/{refund_id}/status',
            path: {
                'refund_id': refundId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
