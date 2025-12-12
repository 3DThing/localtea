/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LoginRequest } from '../models/LoginRequest';
import type { LoginResponse } from '../models/LoginResponse';
import type { RefreshRequest } from '../models/RefreshRequest';
import type { Token } from '../models/Token';
import type { TwoFASetupResponse } from '../models/TwoFASetupResponse';
import type { TwoFAVerifyRequest } from '../models/TwoFAVerifyRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * Login
     * @param requestBody
     * @returns LoginResponse Successful Response
     * @throws ApiError
     */
    public static loginApiV1AuthLoginPost(
        requestBody: LoginRequest,
    ): CancelablePromise<LoginResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Setup 2Fa
     * @param tempToken
     * @returns TwoFASetupResponse Successful Response
     * @throws ApiError
     */
    public static setup2FaApiV1Auth2FaSetupPost(
        tempToken: string,
    ): CancelablePromise<TwoFASetupResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/2fa/setup',
            query: {
                'temp_token': tempToken,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Verify 2Fa
     * @param requestBody
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static verify2FaApiV1Auth2FaVerifyPost(
        requestBody: TwoFAVerifyRequest,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/2fa/verify',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Refresh Token
     * Refresh access token using refresh token.
     * @param requestBody
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static refreshTokenApiV1AuthRefreshPost(
        requestBody: RefreshRequest,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
