/* Finance Service */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export type TransactionType = 'sale' | 'refund' | 'deposit' | 'withdrawal' | 'expense' | 'adjustment';

export interface FinanceTransaction {
    id: number;
    transaction_type: TransactionType;
    amount_cents: number;
    description: string;
    category: string | null;
    order_id: number | null;
    admin_id: number | null;
    admin_name?: string | null;
    balance_after_cents: number;
    created_at: string;
}

export interface FinanceBalance {
    current_balance_cents: number;
    total_income_cents: number;
    total_expense_cents: number;
    today_income_cents: number;
    today_expense_cents: number;
    month_income_cents: number;
    month_expense_cents: number;
}

export interface FinanceAnalytics {
    balance: FinanceBalance;
    period_stats: Array<{
        period: string;
        income_cents: number;
        expense_cents: number;
        profit_cents: number;
        transactions_count: number;
    }>;
    expense_by_category: Array<{
        category: string;
        total_cents: number;
        count: number;
    }>;
    income_by_type: Array<{
        category: string;
        total_cents: number;
        count: number;
    }>;
    recent_transactions: FinanceTransaction[];
}

export interface TransactionsListResponse {
    items: FinanceTransaction[];
    total: number;
    skip: number;
    limit: number;
}

export interface DepositRequest {
    amount_cents: number;
    description: string;
}

export interface WithdrawalRequest {
    amount_cents: number;
    description: string;
}

export interface ExpenseRequest {
    amount_cents: number;
    description: string;
    category?: string;
}

export interface AdjustmentRequest {
    amount_cents: number;
    description: string;
}

export class FinanceService {
    /**
     * Get Current Balance
     * Returns the current store balance and summary statistics.
     * @returns FinanceBalance Successful Response
     * @throws ApiError
     */
    public static getBalance(): CancelablePromise<FinanceBalance> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/finance/balance',
        });
    }

    /**
     * List Transactions
     * Get list of finance transactions with filters.
     * @param skip
     * @param limit
     * @param transactionType
     * @param startDate
     * @param endDate
     * @param category
     * @returns TransactionsListResponse Successful Response
     * @throws ApiError
     */
    public static listTransactions(
        skip?: number,
        limit: number = 50,
        transactionType?: TransactionType | null,
        startDate?: string | null,
        endDate?: string | null,
        category?: string | null,
    ): CancelablePromise<TransactionsListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/finance/transactions',
            query: {
                'skip': skip,
                'limit': limit,
                'transaction_type': transactionType,
                'start_date': startDate,
                'end_date': endDate,
                'category': category,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Deposit
     * Record a deposit (cash added to the store).
     * @param requestBody
     * @returns FinanceTransaction Successful Response
     * @throws ApiError
     */
    public static createDeposit(requestBody: DepositRequest): CancelablePromise<FinanceTransaction> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/finance/deposit',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Withdrawal
     * Record a withdrawal (cash taken from the store).
     * @param requestBody
     * @returns FinanceTransaction Successful Response
     * @throws ApiError
     */
    public static createWithdrawal(requestBody: WithdrawalRequest): CancelablePromise<FinanceTransaction> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/finance/withdrawal',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Expense
     * Record an expense (operational cost).
     * @param requestBody
     * @returns FinanceTransaction Successful Response
     * @throws ApiError
     */
    public static createExpense(requestBody: ExpenseRequest): CancelablePromise<FinanceTransaction> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/finance/expense',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Adjustment
     * Record a balance adjustment (correction).
     * @param requestBody
     * @returns FinanceTransaction Successful Response
     * @throws ApiError
     */
    public static createAdjustment(requestBody: AdjustmentRequest): CancelablePromise<FinanceTransaction> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/finance/adjustment',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Analytics
     * Get financial analytics for a period.
     * @param days Number of days for analytics
     * @returns FinanceAnalytics Successful Response
     * @throws ApiError
     */
    public static getAnalytics(
        days: number = 30,
    ): CancelablePromise<FinanceAnalytics> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/finance/analytics',
            query: {
                'days': days,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Categories
     * Get list of expense categories.
     * @returns string[] Successful Response
     * @throws ApiError
     */
    public static getCategories(): CancelablePromise<string[]> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/finance/categories',
        });
    }
}
