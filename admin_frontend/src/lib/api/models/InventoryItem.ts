/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Inventory item with product info.
 */
export type InventoryItem = {
    sku_id: number;
    sku_code: string;
    product_id: number;
    product_name: string;
    weight_grams: number;
    price_cents: number;
    stock_quantity: number;
    reserved_quantity?: number;
    available_quantity?: number;
    is_low_stock?: boolean;
    last_updated?: (string | null);
};

