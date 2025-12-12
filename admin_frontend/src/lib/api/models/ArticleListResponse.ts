/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArticleAdminResponse } from './ArticleAdminResponse';
/**
 * Ответ со списком статей и пагинацией
 */
export type ArticleListResponse = {
    items: Array<ArticleAdminResponse>;
    total: number;
};

