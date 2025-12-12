/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommentAuthor } from './CommentAuthor';
export type CommentModerationResponse = {
    id: number;
    content: string;
    user_id: number;
    user?: (CommentAuthor | null);
    article_id?: (number | null);
    product_id?: (number | null);
    likes_count?: number;
    reports_count?: number;
    created_at: string;
};

