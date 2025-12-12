/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RefundResponse = {
    id: number;
    order_id: number;
    payment_id: string;
    refund_id?: (string | null);
    amount_cents: number;
    reason: string;
    status: string;
    admin_id: number;
    created_at: string;
    updated_at?: (string | null);
};

