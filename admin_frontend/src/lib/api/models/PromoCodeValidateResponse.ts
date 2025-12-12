/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromoCodeResponse } from './PromoCodeResponse';
export type PromoCodeValidateResponse = {
    valid: boolean;
    discount_amount_cents?: number;
    message?: (string | null);
    promo_code?: (PromoCodeResponse | null);
};

