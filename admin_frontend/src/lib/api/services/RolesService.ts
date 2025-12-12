/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssignRoleRequest } from '../models/AssignRoleRequest';
import type { PermissionsListResponse } from '../models/PermissionsListResponse';
import type { RoleCreate } from '../models/RoleCreate';
import type { RoleListResponse } from '../models/RoleListResponse';
import type { RoleResponse } from '../models/RoleResponse';
import type { RoleUpdate } from '../models/RoleUpdate';
import type { UserRolesResponse } from '../models/UserRolesResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RolesService {
    /**
     * List Permissions
     * List all available permissions.
     * @returns PermissionsListResponse Successful Response
     * @throws ApiError
     */
    public static listPermissionsApiV1RolesPermissionsGet(): CancelablePromise<PermissionsListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/roles/permissions',
        });
    }
    /**
     * List Roles
     * List all roles.
     * @returns RoleListResponse Successful Response
     * @throws ApiError
     */
    public static listRolesApiV1RolesGet(): CancelablePromise<RoleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/roles',
        });
    }
    /**
     * Create Role
     * Create a new role.
     * @param requestBody
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static createRoleApiV1RolesPost(
        requestBody: RoleCreate,
    ): CancelablePromise<RoleResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/roles',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Role
     * Get role by ID.
     * @param roleId
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static getRoleApiV1RolesRoleIdGet(
        roleId: number,
    ): CancelablePromise<RoleResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/roles/{role_id}',
            path: {
                'role_id': roleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Role
     * Update a role.
     * @param roleId
     * @param requestBody
     * @returns RoleResponse Successful Response
     * @throws ApiError
     */
    public static updateRoleApiV1RolesRoleIdPatch(
        roleId: number,
        requestBody: RoleUpdate,
    ): CancelablePromise<RoleResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/roles/{role_id}',
            path: {
                'role_id': roleId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Role
     * Delete a role.
     * @param roleId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteRoleApiV1RolesRoleIdDelete(
        roleId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/roles/{role_id}',
            path: {
                'role_id': roleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Assign Role To User
     * Assign a role to a user.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static assignRoleToUserApiV1RolesAssignPost(
        requestBody: AssignRoleRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/roles/assign',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unassign Role From User
     * Remove a role from a user.
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static unassignRoleFromUserApiV1RolesUnassignPost(
        requestBody: AssignRoleRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/roles/unassign',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get User Roles
     * Get roles assigned to a user.
     * @param userId
     * @returns UserRolesResponse Successful Response
     * @throws ApiError
     */
    public static getUserRolesApiV1RolesUserUserIdGet(
        userId: number,
    ): CancelablePromise<UserRolesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/roles/user/{user_id}',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Initialize Builtin Roles
     * Initialize built-in roles if they don't exist.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static initializeBuiltinRolesApiV1RolesInitializePost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/roles/initialize',
        });
    }
}
