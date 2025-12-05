/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProductImage } from './ProductImage';
import type { SKU } from './SKU';
export type Product = {
    title: string;
    slug: string;
    tea_type?: (string | null);
    description?: (string | null);
    lore_description?: (string | null);
    brewing_guide?: (Record<string, any> | null);
    category_id: number;
    is_active?: (boolean | null);
    seo_title?: (string | null);
    seo_description?: (string | null);
    seo_keywords?: (string | null);
    id: number;
    created_at?: (string | null);
    updated_at?: (string | null);
    skus?: Array<SKU>;
    images?: Array<ProductImage>;
};

