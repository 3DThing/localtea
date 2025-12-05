/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OrderItemResponse } from './OrderItemResponse';
import type { OrderStatus } from './OrderStatus';
export type OrderAdminResponse = {
    id: number;
    user_id?: (number | null);
    status: OrderStatus;
    total_amount_cents: number;
    shipping_address?: (Record<string, any> | null);
    contact_info?: (Record<string, any> | null);
    created_at: string;
    items?: Array<OrderItemResponse>;
};

