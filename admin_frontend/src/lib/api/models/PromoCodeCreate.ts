/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DiscountType } from './DiscountType';
export type PromoCodeCreate = {
    /**
     * Уникальный код промокода
     */
    code: string;
    description?: (string | null);
    discount_type?: DiscountType;
    /**
     * Значение скидки (% или копейки)
     */
    discount_value: number;
    /**
     * Минимальная сумма заказа
     */
    min_order_amount_cents?: number;
    /**
     * Максимальная скидка (для %)
     */
    max_discount_cents?: (number | null);
    /**
     * Общий лимит использований
     */
    usage_limit?: (number | null);
    /**
     * Лимит на пользователя
     */
    usage_limit_per_user?: number;
    valid_from?: (string | null);
    valid_until?: (string | null);
    is_active?: boolean;
};

