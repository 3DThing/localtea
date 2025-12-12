"""
Finance models for tracking store finances.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from backend.db.base import Base


class TransactionType(str, Enum):
    """Types of financial transactions."""
    SALE = "sale"              # Продажа (автоматически при оплате заказа)
    REFUND = "refund"          # Возврат (при отмене/возврате заказа)
    DEPOSIT = "deposit"        # Внесение денег в кассу
    WITHDRAWAL = "withdrawal"  # Изъятие денег из кассы
    EXPENSE = "expense"        # Расход (закупки, оплата услуг)
    ADJUSTMENT = "adjustment"  # Корректировка баланса


class FinanceTransaction(Base):
    """
    Financial transaction log.
    Tracks all money movements in the store.
    """
    __tablename__ = "finance_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Transaction type
    transaction_type = Column(
        SQLEnum(TransactionType, name='transaction_type', values_callable=lambda x: [e.value for e in x], create_type=False),
        nullable=False,
        index=True
    )
    
    # Amount in cents (positive for income, negative for expense)
    amount_cents = Column(Integer, nullable=False)
    
    # Description/reason
    description = Column(Text, nullable=False)
    
    # Category for expenses (optional)
    category = Column(String(100), nullable=True)
    
    # Related order (for sales/refunds)
    order_id = Column(Integer, ForeignKey("order.id"), nullable=True, index=True)
    order = relationship("Order", backref="finance_transactions")
    
    # Who performed the transaction (admin)
    admin_id = Column(Integer, ForeignKey("user.id"), nullable=True, index=True)
    admin = relationship("User", backref="finance_transactions")
    
    # Balance after transaction
    balance_after_cents = Column(Integer, nullable=False, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<FinanceTransaction {self.id}: {self.transaction_type.value} {self.amount_cents}>"
