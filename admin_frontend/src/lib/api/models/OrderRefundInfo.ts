/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RefundResponse } from './RefundResponse';
/**
 * Refund information for an order.
 */
export type OrderRefundInfo = {
    order_id: number;
    order_total_cents: number;
    total_refunded_cents: number;
    remaining_refundable_cents: number;
    refunds: Array<RefundResponse>;
    can_refund: boolean;
    payment_id?: (string | null);
};

