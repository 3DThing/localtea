/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DiscountType } from './DiscountType';
export type PromoCodeUpdate = {
    description?: (string | null);
    discount_type?: (DiscountType | null);
    discount_value?: (number | null);
    min_order_amount_cents?: (number | null);
    max_discount_cents?: (number | null);
    usage_limit?: (number | null);
    usage_limit_per_user?: (number | null);
    valid_from?: (string | null);
    valid_until?: (string | null);
    is_active?: (boolean | null);
};

