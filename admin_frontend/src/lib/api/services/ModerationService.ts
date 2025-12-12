/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommentListResponse } from '../models/CommentListResponse';
import type { ReportListResponse } from '../models/ReportListResponse';
import type { ReportResolve } from '../models/ReportResolve';
import type { ReportStatus } from '../models/ReportStatus';
import type { UserBanRequest } from '../models/UserBanRequest';
import type { UserBanResponse } from '../models/UserBanResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ModerationService {
    /**
     * List Comments
     * Get list of comments for moderation.
     *
     * - **user_id**: filter by author
     * - **article_id/product_id**: filter by target
     * - **has_reports**: only comments with reports
     * - **q**: search in content
     * @param skip
     * @param limit
     * @param userId
     * @param articleId
     * @param productId
     * @param hasReports
     * @param q
     * @returns CommentListResponse Successful Response
     * @throws ApiError
     */
    public static listCommentsApiV1ModerationCommentsGet(
        skip?: number,
        limit: number = 50,
        userId?: (number | null),
        articleId?: (number | null),
        productId?: (number | null),
        hasReports?: (boolean | null),
        q?: (string | null),
    ): CancelablePromise<CommentListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/moderation/comments',
            query: {
                'skip': skip,
                'limit': limit,
                'user_id': userId,
                'article_id': articleId,
                'product_id': productId,
                'has_reports': hasReports,
                'q': q,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Comment
     * Delete a comment by ID.
     * @param commentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteCommentApiV1ModerationCommentsCommentIdDelete(
        commentId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/moderation/comments/{comment_id}',
            path: {
                'comment_id': commentId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Reports
     * Get list of comment reports.
     *
     * - **status**: filter by status (new, resolved, rejected)
     * @param skip
     * @param limit
     * @param status
     * @returns ReportListResponse Successful Response
     * @throws ApiError
     */
    public static listReportsApiV1ModerationReportsGet(
        skip?: number,
        limit: number = 50,
        status?: (ReportStatus | null),
    ): CancelablePromise<ReportListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/moderation/reports',
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
     * Resolve Report
     * Resolve a report.
     *
     * Actions:
     * - **resolve**: Mark as resolved (no action on comment)
     * - **reject**: Reject the report
     * - **delete_comment**: Delete the reported comment
     * @param reportId
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static resolveReportApiV1ModerationReportsReportIdResolvePost(
        reportId: number,
        requestBody: ReportResolve,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/moderation/reports/{report_id}/resolve',
            path: {
                'report_id': reportId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Ban User
     * Ban a user.
     *
     * Sets is_active=False which prevents login.
     * @param userId
     * @param requestBody
     * @returns UserBanResponse Successful Response
     * @throws ApiError
     */
    public static banUserApiV1ModerationUsersUserIdBanPost(
        userId: number,
        requestBody: UserBanRequest,
    ): CancelablePromise<UserBanResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/moderation/users/{user_id}/ban',
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
     * Unban User
     * Unban a user.
     * @param userId
     * @returns UserBanResponse Successful Response
     * @throws ApiError
     */
    public static unbanUserApiV1ModerationUsersUserIdUnbanPost(
        userId: number,
    ): CancelablePromise<UserBanResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/moderation/users/{user_id}/unban',
            path: {
                'user_id': userId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Banned Users
     * Get list of banned users.
     * @param skip
     * @param limit
     * @returns CommentListResponse Successful Response
     * @throws ApiError
     */
    public static listBannedUsersApiV1ModerationUsersBannedGet(
        skip?: number,
        limit: number = 50,
    ): CancelablePromise<CommentListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/moderation/users/banned',
            query: {
                'skip': skip,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
