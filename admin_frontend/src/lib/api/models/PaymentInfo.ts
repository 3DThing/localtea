/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentStatus } from './PaymentStatus';
export type PaymentInfo = {
    id: number;
    external_id?: (string | null);
    amount_cents: number;
    status: PaymentStatus;
    created_at?: (string | null);
};

