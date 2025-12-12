/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeliveryMethod } from './DeliveryMethod';
import type { OrderItemResponse } from './OrderItemResponse';
import type { OrderStatus } from './OrderStatus';
import type { PaymentInfo } from './PaymentInfo';
export type OrderAdminResponse = {
    id: number;
    user_id?: (number | null);
    session_id?: (string | null);
    status: OrderStatus;
    total_amount_cents: number;
    delivery_cost_cents?: number;
    discount_amount_cents?: number;
    promo_code?: (string | null);
    delivery_method?: (DeliveryMethod | null);
    tracking_number?: (string | null);
    shipping_address?: (Record<string, any> | null);
    contact_info?: (Record<string, any> | null);
    created_at: string;
    expires_at?: (string | null);
    items?: Array<OrderItemResponse>;
    payments?: Array<PaymentInfo>;
};

