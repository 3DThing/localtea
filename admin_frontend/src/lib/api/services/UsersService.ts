/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Token } from '../models/Token';
import type { UserAdminResponse } from '../models/UserAdminResponse';
import type { UserAdminUpdate } from '../models/UserAdminUpdate';
import type { UserListResponse } from '../models/UserListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Read Users
     * @param skip
     * @param limit
     * @param q
     * @param isSuperuser
     * @returns UserListResponse Successful Response
     * @throws ApiError
     */
    public static readUsersApiV1UsersGet(
        skip?: number,
        limit: number = 100,
        q?: (string | null),
        isSuperuser?: (boolean | null),
    ): CancelablePromise<UserListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/',
            query: {
                'skip': skip,
                'limit': limit,
                'q': q,
                'is_superuser': isSuperuser,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Read User
     * @param userId
     * @returns UserAdminResponse Successful Response
     * @throws ApiError
     */
    public static readUserApiV1UsersUserIdGet(
        userId: number,
    ): CancelablePromise<UserAdminResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/users/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update User
     * @param userId
     * @param requestBody
     * @returns UserAdminResponse Successful Response
     * @throws ApiError
     */
    public static updateUserApiV1UsersUserIdPatch(
        userId: number,
        requestBody: UserAdminUpdate,
    ): CancelablePromise<UserAdminResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/users/{user_id}',
            path: {
                'user_id': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete User
     * @param userId
     * @returns UserAdminResponse Successful Response
     * @throws ApiError
     */
    public static deleteUserApiV1UsersUserIdDelete(
        userId: number,
    ): CancelablePromise<UserAdminResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/users/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reset 2Fa
     * @param userId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static reset2FaApiV1UsersUserIdReset2FaPost(
        userId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/users/{user_id}/reset-2fa',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Impersonate User
     * @param userId
     * @returns Token Successful Response
     * @throws ApiError
     */
    public static impersonateUserApiV1UsersUserIdImpersonatePost(
        userId: number,
    ): CancelablePromise<Token> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/users/{user_id}/impersonate',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
