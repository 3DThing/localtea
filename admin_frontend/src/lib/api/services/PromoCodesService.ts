/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromoCodeCreate } from '../models/PromoCodeCreate';
import type { PromoCodeListResponse } from '../models/PromoCodeListResponse';
import type { PromoCodeResponse } from '../models/PromoCodeResponse';
import type { PromoCodeUpdate } from '../models/PromoCodeUpdate';
import type { PromoCodeValidate } from '../models/PromoCodeValidate';
import type { PromoCodeValidateResponse } from '../models/PromoCodeValidateResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PromoCodesService {
    /**
     * List Promo Codes
     * Get list of promo codes.
     *
     * - **is_active**: filter by active status
     * - **is_valid**: filter by current validity (checks dates and usage limits)
     * - **q**: search in code and description
     * @param skip
     * @param limit
     * @param isActive
     * @param isValid
     * @param q
     * @returns PromoCodeListResponse Successful Response
     * @throws ApiError
     */
    public static listPromoCodesApiV1PromoCodesGet(
        skip?: number,
        limit: number = 50,
        isActive?: (boolean | null),
        isValid?: (boolean | null),
        q?: (string | null),
    ): CancelablePromise<PromoCodeListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/promo-codes',
            query: {
                'skip': skip,
                'limit': limit,
                'is_active': isActive,
                'is_valid': isValid,
                'q': q,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Promo Code
     * Create a new promo code.
     * @param requestBody
     * @returns PromoCodeResponse Successful Response
     * @throws ApiError
     */
    public static createPromoCodeApiV1PromoCodesPost(
        requestBody: PromoCodeCreate,
    ): CancelablePromise<PromoCodeResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/promo-codes',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Promo Code
     * Get promo code by ID.
     * @param promoId
     * @returns PromoCodeResponse Successful Response
     * @throws ApiError
     */
    public static getPromoCodeApiV1PromoCodesPromoIdGet(
        promoId: number,
    ): CancelablePromise<PromoCodeResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/promo-codes/{promo_id}',
            path: {
                'promo_id': promoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Promo Code
     * Update a promo code.
     * @param promoId
     * @param requestBody
     * @returns PromoCodeResponse Successful Response
     * @throws ApiError
     */
    public static updatePromoCodeApiV1PromoCodesPromoIdPatch(
        promoId: number,
        requestBody: PromoCodeUpdate,
    ): CancelablePromise<PromoCodeResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/promo-codes/{promo_id}',
            path: {
                'promo_id': promoId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Promo Code
     * Delete a promo code.
     * @param promoId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deletePromoCodeApiV1PromoCodesPromoIdDelete(
        promoId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/promo-codes/{promo_id}',
            path: {
                'promo_id': promoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Validate Promo Code
     * Validate a promo code and calculate discount.
     *
     * Used for testing promo codes in admin panel.
     * @param requestBody
     * @returns PromoCodeValidateResponse Successful Response
     * @throws ApiError
     */
    public static validatePromoCodeApiV1PromoCodesValidatePost(
        requestBody: PromoCodeValidate,
    ): CancelablePromise<PromoCodeValidateResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/promo-codes/validate',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Toggle Promo Code
     * Toggle promo code active status.
     * @param promoId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static togglePromoCodeApiV1PromoCodesPromoIdTogglePost(
        promoId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/promo-codes/{promo_id}/toggle',
            path: {
                'promo_id': promoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
