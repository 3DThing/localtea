/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RefundCreate = {
    order_id: number;
    /**
     * Amount to refund in cents
     */
    amount_cents: number;
    /**
     * Reason for refund
     */
    reason: string;
    full_refund?: boolean;
};

