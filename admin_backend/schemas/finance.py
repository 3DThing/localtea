"""
Finance schemas for admin panel.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class TransactionTypeEnum(str, Enum):
    """Transaction types."""
    SALE = "sale"
    REFUND = "refund"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    EXPENSE = "expense"
    ADJUSTMENT = "adjustment"


# ==================== Transaction Schemas ====================

class FinanceTransactionCreate(BaseModel):
    """Create a finance transaction (manual)."""
    transaction_type: TransactionTypeEnum
    amount_cents: int = Field(..., description="Amount in cents (positive for income, negative for expense)")
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)
    order_id: Optional[int] = None


class FinanceTransactionResponse(BaseModel):
    """Finance transaction response."""
    id: int
    transaction_type: str
    amount_cents: int
    description: str
    category: Optional[str] = None
    order_id: Optional[int] = None
    order_number: Optional[str] = None
    admin_id: Optional[int] = None
    admin_name: Optional[str] = None
    balance_after_cents: int
    created_at: datetime
    
    model_config = {"from_attributes": True}


class FinanceTransactionListResponse(BaseModel):
    """List of transactions."""
    items: List[FinanceTransactionResponse]
    total: int


# ==================== Balance Schemas ====================

class FinanceBalance(BaseModel):
    """Current finance balance."""
    current_balance_cents: int
    total_income_cents: int
    total_expense_cents: int
    today_income_cents: int
    today_expense_cents: int
    month_income_cents: int
    month_expense_cents: int


# ==================== Analytics Schemas ====================

class FinancePeriodStats(BaseModel):
    """Stats for a period."""
    period: str  # day, week, month
    income_cents: int
    expense_cents: int
    profit_cents: int
    transactions_count: int


class FinanceCategoryStats(BaseModel):
    """Stats by category."""
    category: str
    total_cents: int
    count: int


class FinanceAnalytics(BaseModel):
    """Finance analytics."""
    balance: FinanceBalance
    period_stats: List[FinancePeriodStats]
    expense_by_category: List[FinanceCategoryStats]
    income_by_type: List[FinanceCategoryStats]
    recent_transactions: List[FinanceTransactionResponse]


# ==================== Deposit/Withdrawal Schemas ====================

class DepositRequest(BaseModel):
    """Deposit money into the store."""
    amount_cents: int = Field(..., gt=0, description="Amount to deposit in cents")
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)


class WithdrawalRequest(BaseModel):
    """Withdraw money from the store."""
    amount_cents: int = Field(..., gt=0, description="Amount to withdraw in cents")
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(None, max_length=100)


class ExpenseRequest(BaseModel):
    """Record an expense."""
    amount_cents: int = Field(..., gt=0, description="Expense amount in cents")
    description: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., min_length=1, max_length=100)
