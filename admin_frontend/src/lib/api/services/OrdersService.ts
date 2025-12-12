/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeliveryMethod } from '../models/DeliveryMethod';
import type { OrderAdminResponse } from '../models/OrderAdminResponse';
import type { OrderListResponse } from '../models/OrderListResponse';
import type { OrderStatus } from '../models/OrderStatus';
import type { OrderStatusUpdate } from '../models/OrderStatusUpdate';
import type { OrderTrackingUpdate } from '../models/OrderTrackingUpdate';
import type { PaymentInfo } from '../models/PaymentInfo';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrdersService {
    /**
     * Read Orders
     * Получить список заказов с фильтрацией и поиском.
     *
     * - **status**: фильтр по статусу
     * - **delivery_method**: фильтр по способу доставки
     * - **date_from/date_to**: фильтр по дате создания
     * - **user_id**: фильтр по пользователю
     * - **min_amount/max_amount**: фильтр по сумме (в копейках)
     * - **q**: поиск по ID заказа, телефону, email или трек-номеру
     * @param skip
     * @param limit
     * @param status
     * @param deliveryMethod
     * @param dateFrom
     * @param dateTo
     * @param userId
     * @param minAmount
     * @param maxAmount
     * @param q
     * @returns OrderListResponse Successful Response
     * @throws ApiError
     */
    public static readOrdersApiV1OrdersGet(
        skip?: number,
        limit: number = 50,
        status?: (OrderStatus | null),
        deliveryMethod?: (DeliveryMethod | null),
        dateFrom?: (string | null),
        dateTo?: (string | null),
        userId?: (number | null),
        minAmount?: (number | null),
        maxAmount?: (number | null),
        q?: (string | null),
    ): CancelablePromise<OrderListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/orders/',
            query: {
                'skip': skip,
                'limit': limit,
                'status': status,
                'delivery_method': deliveryMethod,
                'date_from': dateFrom,
                'date_to': dateTo,
                'user_id': userId,
                'min_amount': minAmount,
                'max_amount': maxAmount,
                'q': q,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read Order
     * Получить детали заказа включая платежи.
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
     * Read Order Payments
     * Получить список платежей по заказу.
     * @param id
     * @returns PaymentInfo Successful Response
     * @throws ApiError
     */
    public static readOrderPaymentsApiV1OrdersIdPaymentsGet(
        id: number,
    ): CancelablePromise<Array<PaymentInfo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/orders/{id}/payments',
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
     * Обновить статус заказа.
     *
     * Допустимые переходы:
     * - awaiting_payment → paid, cancelled
     * - paid → processing, cancelled
     * - processing → shipped, cancelled
     * - shipped → delivered
     * - delivered, cancelled → финальные статусы
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
     * Update Tracking Number
     * Установить трек-номер для заказа.
     *
     * Обычно используется после смены статуса на 'shipped'.
     * @param id
     * @param requestBody
     * @returns OrderAdminResponse Successful Response
     * @throws ApiError
     */
    public static updateTrackingNumberApiV1OrdersIdTrackingPatch(
        id: number,
        requestBody: OrderTrackingUpdate,
    ): CancelablePromise<OrderAdminResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/orders/{id}/tracking',
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
     * Отменить заказ.
     *
     * Можно отменить только заказы в статусах: awaiting_payment, paid, processing.
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
