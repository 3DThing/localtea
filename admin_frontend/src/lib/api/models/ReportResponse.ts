/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommentModerationResponse } from './CommentModerationResponse';
import type { ReportStatus } from './ReportStatus';
export type ReportResponse = {
    id: number;
    user_id: number;
    comment_id: number;
    reason: string;
    status: ReportStatus;
    created_at: string;
    comment?: (CommentModerationResponse | null);
};

