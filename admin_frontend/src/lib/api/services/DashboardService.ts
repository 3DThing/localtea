/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DashboardService {
    /**
     * Get Dashboard Stats
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getDashboardStatsApiV1DashboardStatsGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/stats',
        });
    }
    /**
     * Get Sales Analytics
     * Get detailed sales analytics report.
     *
     * - **date_from/date_to**: Period filter (defaults to last 30 days)
     * - **group_by**: Grouping period (day, week, month)
     * @param dateFrom
     * @param dateTo
     * @param groupBy
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getSalesAnalyticsApiV1DashboardAnalyticsSalesGet(
        dateFrom?: (string | null),
        dateTo?: (string | null),
        groupBy: string = 'day',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/sales',
            query: {
                'date_from': dateFrom,
                'date_to': dateTo,
                'group_by': groupBy,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Top Products
     * Get top selling products.
     *
     * - **limit**: Number of products to return
     * - **order_by**: Sort by quantity sold or revenue
     * @param dateFrom
     * @param dateTo
     * @param limit
     * @param orderBy
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTopProductsApiV1DashboardAnalyticsProductsGet(
        dateFrom?: (string | null),
        dateTo?: (string | null),
        limit: number = 10,
        orderBy: string = 'quantity',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/products',
            query: {
                'date_from': dateFrom,
                'date_to': dateTo,
                'limit': limit,
                'order_by': orderBy,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Top Categories
     * Get top selling categories by revenue.
     * @param dateFrom
     * @param dateTo
     * @param limit
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTopCategoriesApiV1DashboardAnalyticsCategoriesGet(
        dateFrom?: (string | null),
        dateTo?: (string | null),
        limit: number = 10,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/categories',
            query: {
                'date_from': dateFrom,
                'date_to': dateTo,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Users Analytics
     * Get user registration and activity analytics.
     * @param dateFrom
     * @param dateTo
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getUsersAnalyticsApiV1DashboardAnalyticsUsersGet(
        dateFrom?: (string | null),
        dateTo?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/users',
            query: {
                'date_from': dateFrom,
                'date_to': dateTo,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Conversion Funnel
     * Get order conversion funnel (created → paid → shipped → delivered).
     * @param dateFrom
     * @param dateTo
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getConversionFunnelApiV1DashboardAnalyticsFunnelGet(
        dateFrom?: (string | null),
        dateTo?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/analytics/funnel',
            query: {
                'date_from': dateFrom,
                'date_to': dateTo,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Inventory Alerts
     * Get products with low stock levels.
     *
     * - **threshold**: Stock quantity threshold (default: 5)
     * @param threshold
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getInventoryAlertsApiV1DashboardInventoryAlertsGet(
        threshold: number = 5,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/dashboard/inventory/alerts',
            query: {
                'threshold': threshold,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
