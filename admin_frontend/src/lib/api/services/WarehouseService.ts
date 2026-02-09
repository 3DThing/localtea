/* Custom API service for inventory management */
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
import type { CancelablePromise } from '../core/CancelablePromise';

// Types for inventory
export interface InventoryCategory {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
    materials_count: number;
}

export interface InventoryCategoryCreate {
    name: string;
    description?: string | null;
    is_active?: boolean;
    sort_order?: number;
}

export interface InventoryCategoryUpdate {
    name?: string;
    description?: string | null;
    is_active?: boolean;
    sort_order?: number;
}

export interface InventoryMaterial {
    id: number;
    category_id: number;
    name: string;
    sku_code: string | null;
    description: string | null;
    unit: string;
    quantity: number;
    min_quantity: number;
    cost_per_unit_cents: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    category_name: string | null;
    is_low_stock: boolean;
    total_value_cents: number;
}

export interface InventoryMaterialCreate {
    category_id: number;
    name: string;
    sku_code?: string | null;
    description?: string | null;
    unit?: string;
    quantity?: number;
    min_quantity?: number;
    cost_per_unit_cents?: number;
    is_active?: boolean;
}

export interface InventoryMaterialUpdate {
    category_id?: number;
    name?: string;
    sku_code?: string | null;
    description?: string | null;
    unit?: string;
    min_quantity?: number;
    cost_per_unit_cents?: number;
    is_active?: boolean;
}

export interface MaterialStockAdjustment {
    material_id: number;
    quantity: number;
    movement_type: 'incoming' | 'outgoing' | 'adjustment' | 'return' | 'write_off' | 'transfer';
    reason: string;
}

export interface ProductStock {
    id: number;
    sku_id: number;
    sku_weight_grams: number;
    sku_price_cents: number;
    product_id: number;
    product_name: string;
    category_id: number | null;
    category_name: string | null;
    quantity: number;
    reserved: number;
    available: number;
    min_quantity: number;
    is_low_stock: boolean;
    updated_at: string;
}

export interface ProductStockAdjustment {
    sku_id: number;
    quantity: number;
    movement_type: 'incoming' | 'outgoing' | 'adjustment' | 'return' | 'write_off' | 'transfer';
    reason: string;
}

export interface InventoryMovement {
    id: number;
    material_id: number | null;
    material_name: string | null;
    sku_id: number | null;
    product_name: string | null;
    sku_weight_grams: number | null;
    movement_type: string;
    quantity: number;
    quantity_before: number;
    quantity_after: number;
    reason: string | null;
    order_id: number | null;
    admin_id: number | null;
    admin_name: string | null;
    created_at: string;
}

export interface CategoryAnalytics {
    category_id: number;
    category_name: string;
    materials_count: number;
    total_quantity: number;
    total_value_cents: number;
    low_stock_count: number;
}

export interface CatalogCategoryAnalytics {
    category_id: number;
    category_name: string;
    products_count: number;
    skus_count: number;
    total_stock: number;
    total_reserved: number;
    total_available: number;
    total_value_cents: number;
    low_stock_count: number;
    out_of_stock_count: number;
}

export interface InventoryAnalytics {
    total_categories: number;
    total_materials: number;
    materials_total_value_cents: number;
    materials_low_stock_count: number;
    materials_out_of_stock_count: number;
    total_product_skus: number;
    products_total_value_cents: number;
    products_low_stock_count: number;
    products_out_of_stock_count: number;
    // Catalog stats
    total_catalog_categories: number;
    total_catalog_products: number;
    products_total_stock: number;
    products_reserved_stock: number;
    products_available_stock: number;
    // Movement stats
    movements_incoming_count: number;
    movements_outgoing_count: number;
    movements_adjustment_count: number;
    movements_return_count: number;
    movements_write_off_count: number;
    top_materials_by_value: Array<{ id: number; name: string; value_cents: number }>;
    top_products_by_value: Array<{ id: number; sku_id: number; product_name: string; weight_grams: number; quantity: number; price_cents: number; value_cents: number }>;
    recent_movements: InventoryMovement[];
}

export interface InventoryAnalyticsResponse {
    summary: InventoryAnalytics;
    categories_stats: CategoryAnalytics[];
    catalog_categories_stats: CatalogCategoryAnalytics[];
}

export class WarehouseService {
    // ==================== Categories ====================
    public static listCategories(
        skip: number = 0,
        limit: number = 100,
        is_active?: boolean,
        q?: string
    ): CancelablePromise<{ items: InventoryCategory[]; total: number }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory/categories',
            query: { skip, limit, is_active, q },
            errors: { 422: 'Validation Error' },
        });
    }

    public static createCategory(
        data: InventoryCategoryCreate
    ): CancelablePromise<InventoryCategory> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inventory/categories',
            body: data,
            mediaType: 'application/json',
            errors: { 400: 'Bad Request', 422: 'Validation Error' },
        });
    }

    public static updateCategory(
        categoryId: number,
        data: InventoryCategoryUpdate
    ): CancelablePromise<InventoryCategory> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: `/api/v1/inventory/categories/${categoryId}`,
            body: data,
            mediaType: 'application/json',
            errors: { 404: 'Not Found', 422: 'Validation Error' },
        });
    }

    public static deleteCategory(categoryId: number): CancelablePromise<unknown> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: `/api/v1/inventory/categories/${categoryId}`,
            errors: { 400: 'Bad Request', 404: 'Not Found' },
        });
    }

    // ==================== Materials ====================
    public static listMaterials(
        skip: number = 0,
        limit: number = 100,
        category_id?: number,
        is_active?: boolean,
        is_low_stock?: boolean,
        q?: string
    ): CancelablePromise<{ items: InventoryMaterial[]; total: number }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory/materials',
            query: { skip, limit, category_id, is_active, is_low_stock, q },
            errors: { 422: 'Validation Error' },
        });
    }

    public static getMaterial(materialId: number): CancelablePromise<InventoryMaterial> {
        return __request(OpenAPI, {
            method: 'GET',
            url: `/api/v1/inventory/materials/${materialId}`,
            errors: { 404: 'Not Found' },
        });
    }

    public static createMaterial(data: InventoryMaterialCreate): CancelablePromise<InventoryMaterial> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/inventory/materials',
            body: data,
            mediaType: 'application/json',
            errors: { 400: 'Bad Request', 422: 'Validation Error' },
        });
    }

    public static updateMaterial(
        materialId: number,
        data: InventoryMaterialUpdate
    ): CancelablePromise<InventoryMaterial> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: `/api/v1/inventory/materials/${materialId}`,
            body: data,
            mediaType: 'application/json',
            errors: { 404: 'Not Found', 422: 'Validation Error' },
        });
    }

    public static deleteMaterial(materialId: number): CancelablePromise<unknown> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: `/api/v1/inventory/materials/${materialId}`,
            errors: { 404: 'Not Found' },
        });
    }

    public static adjustMaterialStock(
        materialId: number,
        data: MaterialStockAdjustment
    ): CancelablePromise<InventoryMaterial> {
        return __request(OpenAPI, {
            method: 'POST',
            url: `/api/v1/inventory/materials/${materialId}/adjust`,
            body: data,
            mediaType: 'application/json',
            errors: { 400: 'Bad Request', 404: 'Not Found' },
        });
    }

    // ==================== Product Stock ====================
    public static listProductStock(
        skip: number = 0,
        limit: number = 100,
        category_id?: number,
        is_low_stock?: boolean,
        q?: string
    ): CancelablePromise<{ items: ProductStock[]; total: number }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory/products',
            query: { skip, limit, category_id, is_low_stock, q },
            errors: { 422: 'Validation Error' },
        });
    }

    public static adjustProductStock(
        skuId: number,
        data: ProductStockAdjustment
    ): CancelablePromise<ProductStock> {
        return __request(OpenAPI, {
            method: 'POST',
            url: `/api/v1/inventory/products/${skuId}/adjust`,
            body: data,
            mediaType: 'application/json',
            errors: { 400: 'Bad Request', 404: 'Not Found' },
        });
    }

    // ==================== Movements ====================
    public static listMovements(
        skip: number = 0,
        limit: number = 100,
        material_id?: number,
        sku_id?: number,
        movement_type?: string,
        date_from?: string,
        date_to?: string
    ): CancelablePromise<{ items: InventoryMovement[]; total: number }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory/movements',
            query: { skip, limit, material_id, sku_id, movement_type, date_from, date_to },
            errors: { 422: 'Validation Error' },
        });
    }

    // ==================== Analytics ====================
    public static getAnalytics(): CancelablePromise<InventoryAnalyticsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/inventory/analytics',
        });
    }

    // ==================== Catalog (for dropdowns) ====================
    public static listCatalogCategories(): CancelablePromise<Array<{ id: number; name: string; slug: string; parent_id: number | null; description: string | null }>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/catalog/categories',
        });
    }

    public static listCatalogProducts(
        skip: number = 0,
        limit: number = 1000,
        category_id?: number
    ): CancelablePromise<{ items: Array<{ id: number; title: string; slug: string; category_id: number | null; skus: Array<{ id: number; sku_code: string; weight: number; price_cents: number; quantity: number }> }>; total: number }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/catalog/products',
            query: { skip, limit, category_id },
        });
    }
}
