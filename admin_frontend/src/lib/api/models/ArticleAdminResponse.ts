/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArticleAuthor } from './ArticleAuthor';
/**
 * Полная информация о статье для админки
 */
export type ArticleAdminResponse = {
    id: number;
    title: string;
    slug: string;
    content: string;
    preview_image?: (string | null);
    is_published: boolean;
    created_at: string;
    author_id?: (number | null);
    author?: (ArticleAuthor | null);
    views_count?: number;
    likes_count?: number;
    comments_count?: number;
};

