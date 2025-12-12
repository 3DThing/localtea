/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SettingCreate } from '../models/SettingCreate';
import type { SettingGroup } from '../models/SettingGroup';
import type { SettingResponse } from '../models/SettingResponse';
import type { SettingsBulkUpdate } from '../models/SettingsBulkUpdate';
import type { SettingsListResponse } from '../models/SettingsListResponse';
import type { SettingUpdate } from '../models/SettingUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SettingsService {
    /**
     * List Settings
     * List all settings.
     *
     * - **group**: Filter by setting group
     * - **q**: Search in key or description
     * @param group
     * @param q
     * @returns SettingsListResponse Successful Response
     * @throws ApiError
     */
    public static listSettingsApiV1SettingsGet(
        group?: (SettingGroup | null),
        q?: (string | null),
    ): CancelablePromise<SettingsListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/settings',
            query: {
                'group': group,
                'q': q,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Setting
     * Create a new setting.
     * @param requestBody
     * @returns SettingResponse Successful Response
     * @throws ApiError
     */
    public static createSettingApiV1SettingsPost(
        requestBody: SettingCreate,
    ): CancelablePromise<SettingResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/settings',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Settings By Group
     * Get all settings organized by group.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getSettingsByGroupApiV1SettingsByGroupGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/settings/by-group',
        });
    }
    /**
     * Get Setting
     * Get a single setting by key.
     * @param key
     * @returns SettingResponse Successful Response
     * @throws ApiError
     */
    public static getSettingApiV1SettingsKeyGet(
        key: string,
    ): CancelablePromise<SettingResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/settings/{key}',
            path: {
                'key': key,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Setting
     * Update a setting by key.
     * @param key
     * @param requestBody
     * @returns SettingResponse Successful Response
     * @throws ApiError
     */
    public static updateSettingApiV1SettingsKeyPatch(
        key: string,
        requestBody: SettingUpdate,
    ): CancelablePromise<SettingResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/settings/{key}',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Setting
     * Delete a setting.
     * @param key
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteSettingApiV1SettingsKeyDelete(
        key: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/settings/{key}',
            path: {
                'key': key,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Update Settings
     * Bulk update multiple settings at once.
     *
     * Accepts a dictionary of key -> value pairs.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static bulkUpdateSettingsApiV1SettingsBulkUpdatePost(
        requestBody: SettingsBulkUpdate,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/settings/bulk-update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Initialize Default Settings
     * Initialize default settings from predefined keys.
     *
     * Only creates settings that don't exist yet.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static initializeDefaultSettingsApiV1SettingsInitializePost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/settings/initialize',
        });
    }
}
