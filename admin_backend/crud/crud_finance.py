"""
CRUD operations for finance management.
"""
from typing import Optional, List, Tuple
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from backend.models.finance import FinanceTransaction, TransactionType
from backend.models.order import Order
from backend.models.user import User


class CRUDFinanceTransaction:
    """CRUD for finance transactions."""
    
    async def get_current_balance(self, db: AsyncSession) -> int:
        """Get current balance from the last transaction."""
        result = await db.execute(
            select(FinanceTransaction.balance_after_cents)
            .order_by(FinanceTransaction.id.desc())
            .limit(1)
        )
        balance = result.scalar()
        return balance or 0
    
    async def create(
        self,
        db: AsyncSession,
        *,
        transaction_type: TransactionType,
        amount_cents: int,
        description: str,
        category: Optional[str] = None,
        order_id: Optional[int] = None,
        admin_id: Optional[int] = None
    ) -> FinanceTransaction:
        """Create a new transaction."""
        # Get current balance
        current_balance = await self.get_current_balance(db)
        
        # Calculate new balance
        new_balance = current_balance + amount_cents
        
        transaction = FinanceTransaction(
            transaction_type=transaction_type,
            amount_cents=amount_cents,
            description=description,
            category=category,
            order_id=order_id,
            admin_id=admin_id,
            balance_after_cents=new_balance
        )
        db.add(transaction)
        await db.flush()
        await db.refresh(transaction)
        return transaction
    
    async def get(self, db: AsyncSession, transaction_id: int) -> Optional[FinanceTransaction]:
        """Get transaction by ID."""
        result = await db.execute(
            select(FinanceTransaction).where(FinanceTransaction.id == transaction_id)
        )
        return result.scalar_one_or_none()
    
    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
        transaction_type: Optional[TransactionType] = None,
        category: Optional[str] = None,
        order_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        q: Optional[str] = None
    ) -> Tuple[List[FinanceTransaction], int]:
        """Get multiple transactions with filters."""
        query = select(FinanceTransaction)
        count_query = select(func.count(FinanceTransaction.id))
        
        # Filters
        conditions = []
        
        if transaction_type:
            conditions.append(FinanceTransaction.transaction_type == transaction_type)
        
        if category:
            conditions.append(FinanceTransaction.category == category)
        
        if order_id:
            conditions.append(FinanceTransaction.order_id == order_id)
        
        if date_from:
            conditions.append(FinanceTransaction.created_at >= date_from)
        
        if date_to:
            conditions.append(FinanceTransaction.created_at <= date_to)
        
        if q:
            conditions.append(FinanceTransaction.description.ilike(f"%{q}%"))
        
        if conditions:
            query = query.where(and_(*conditions))
            count_query = count_query.where(and_(*conditions))
        
        # Get total
        total = await db.scalar(count_query) or 0
        
        # Get items
        query = query.order_by(FinanceTransaction.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        items = list(result.scalars().all())
        
        return items, total
    
    async def get_balance_stats(self, db: AsyncSession) -> dict:
        """Get balance statistics."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        current_balance = await self.get_current_balance(db)
        
        # Total income (all positive transactions)
        total_income = await db.scalar(
            select(func.sum(FinanceTransaction.amount_cents))
            .where(FinanceTransaction.amount_cents > 0)
        ) or 0
        
        # Total expense (all negative transactions)
        total_expense = await db.scalar(
            select(func.sum(FinanceTransaction.amount_cents))
            .where(FinanceTransaction.amount_cents < 0)
        ) or 0
        
        # Today income
        today_income = await db.scalar(
            select(func.sum(FinanceTransaction.amount_cents))
            .where(
                FinanceTransaction.amount_cents > 0,
                FinanceTransaction.created_at >= today_start
            )
        ) or 0
        
        # Today expense
        today_expense = await db.scalar(
            select(func.sum(FinanceTransaction.amount_cents))
            .where(
                FinanceTransaction.amount_cents < 0,
                FinanceTransaction.created_at >= today_start
            )
        ) or 0
        
        # Month income
        month_income = await db.scalar(
            select(func.sum(FinanceTransaction.amount_cents))
            .where(
                FinanceTransaction.amount_cents > 0,
                FinanceTransaction.created_at >= month_start
            )
        ) or 0
        
        # Month expense
        month_expense = await db.scalar(
            select(func.sum(FinanceTransaction.amount_cents))
            .where(
                FinanceTransaction.amount_cents < 0,
                FinanceTransaction.created_at >= month_start
            )
        ) or 0
        
        return {
            "current_balance_cents": current_balance,
            "total_income_cents": total_income,
            "total_expense_cents": abs(total_expense),
            "today_income_cents": today_income,
            "today_expense_cents": abs(today_expense),
            "month_income_cents": month_income,
            "month_expense_cents": abs(month_expense)
        }
    
    async def get_expense_by_category(self, db: AsyncSession, days: int = 30) -> List[dict]:
        """Get expenses grouped by category."""
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = await db.execute(
            select(
                FinanceTransaction.category,
                func.sum(FinanceTransaction.amount_cents).label('total'),
                func.count(FinanceTransaction.id).label('count')
            )
            .where(
                FinanceTransaction.amount_cents < 0,
                FinanceTransaction.created_at >= since,
                FinanceTransaction.category.isnot(None)
            )
            .group_by(FinanceTransaction.category)
            .order_by(func.sum(FinanceTransaction.amount_cents))
        )
        
        return [
            {"category": row[0] or "Без категории", "total_cents": abs(row[1]), "count": row[2]}
            for row in result.all()
        ]
    
    async def get_income_by_type(self, db: AsyncSession, days: int = 30) -> List[dict]:
        """Get income grouped by transaction type."""
        since = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = await db.execute(
            select(
                FinanceTransaction.transaction_type,
                func.sum(FinanceTransaction.amount_cents).label('total'),
                func.count(FinanceTransaction.id).label('count')
            )
            .where(
                FinanceTransaction.amount_cents > 0,
                FinanceTransaction.created_at >= since
            )
            .group_by(FinanceTransaction.transaction_type)
            .order_by(func.sum(FinanceTransaction.amount_cents).desc())
        )
        
        return [
            {"category": row[0].value if row[0] else "unknown", "total_cents": row[1], "count": row[2]}
            for row in result.all()
        ]
    
    async def create_sale_transaction(
        self,
        db: AsyncSession,
        *,
        order_id: int,
        amount_cents: int,
        admin_id: int = None,
        description: str = None
    ) -> FinanceTransaction:
        """Create a sale transaction from an order."""
        desc = description or f"Продажа по заказу #{order_id}"
        return await self.create(
            db,
            transaction_type=TransactionType.SALE,
            amount_cents=amount_cents,
            description=desc,
            order_id=order_id,
            admin_id=admin_id
        )
    
    async def create_refund_transaction(
        self,
        db: AsyncSession,
        *,
        order_id: int,
        amount_cents: int,
        reason: str = None,
        admin_id: int = None
    ) -> FinanceTransaction:
        """Create a refund transaction."""
        desc = reason or f"Возврат по заказу #{order_id}"
        return await self.create(
            db,
            transaction_type=TransactionType.REFUND,
            amount_cents=-abs(amount_cents),  # Always negative
            description=desc,
            order_id=order_id,
            admin_id=admin_id
        )


finance = CRUDFinanceTransaction()
