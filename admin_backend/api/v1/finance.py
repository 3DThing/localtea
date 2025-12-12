"""
Finance API endpoints for admin panel.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from admin_backend.core.deps import get_db, get_current_admin
from backend.models.user import User
from admin_backend.schemas import finance as schemas
from admin_backend.crud.crud_finance import finance as crud_finance
from backend.models.finance import TransactionType
from backend.models.order import Order

router = APIRouter()


@router.get("/balance", response_model=schemas.FinanceBalance)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get current finance balance and statistics."""
    stats = await crud_finance.get_balance_stats(db)
    return schemas.FinanceBalance(**stats)


@router.get("/transactions", response_model=schemas.FinanceTransactionListResponse)
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    transaction_type: Optional[str] = None,
    category: Optional[str] = None,
    order_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """List finance transactions with filters."""
    # Convert transaction_type string to enum
    tx_type = None
    if transaction_type:
        try:
            tx_type = TransactionType(transaction_type)
        except ValueError:
            pass
    
    transactions, total = await crud_finance.get_multi(
        db,
        skip=skip,
        limit=limit,
        transaction_type=tx_type,
        category=category,
        order_id=order_id,
        date_from=date_from,
        date_to=date_to,
        q=q
    )
    
    # Build response
    items = []
    for tx in transactions:
        # Get admin name
        admin_name = None
        if tx.admin_id:
            admin = await db.get(User, tx.admin_id)
            if admin:
                admin_name = f"{admin.firstname or ''} {admin.lastname or ''}".strip() or admin.email
        
        # Get order number
        order_number = None
        if tx.order_id:
            order = await db.get(Order, tx.order_id)
            if order:
                order_number = str(order.id)
        
        items.append(schemas.FinanceTransactionResponse(
            id=tx.id,
            transaction_type=tx.transaction_type.value,
            amount_cents=tx.amount_cents,
            description=tx.description,
            category=tx.category,
            order_id=tx.order_id,
            order_number=order_number,
            admin_id=tx.admin_id,
            admin_name=admin_name,
            balance_after_cents=tx.balance_after_cents,
            created_at=tx.created_at
        ))
    
    return schemas.FinanceTransactionListResponse(items=items, total=total)


@router.get("/transactions/{transaction_id}", response_model=schemas.FinanceTransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get a specific transaction."""
    tx = await crud_finance.get(db, transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Get admin name
    admin_name = None
    if tx.admin_id:
        admin = await db.get(User, tx.admin_id)
        if admin:
            admin_name = f"{admin.firstname or ''} {admin.lastname or ''}".strip() or admin.email
    
    # Get order number
    order_number = None
    if tx.order_id:
        order = await db.get(Order, tx.order_id)
        if order:
            order_number = str(order.id)
    
    return schemas.FinanceTransactionResponse(
        id=tx.id,
        transaction_type=tx.transaction_type.value,
        amount_cents=tx.amount_cents,
        description=tx.description,
        category=tx.category,
        order_id=tx.order_id,
        order_number=order_number,
        admin_id=tx.admin_id,
        admin_name=admin_name,
        balance_after_cents=tx.balance_after_cents,
        created_at=tx.created_at
    )


@router.post("/deposit", response_model=schemas.FinanceTransactionResponse)
async def deposit_money(
    data: schemas.DepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Deposit money into the store."""
    tx = await crud_finance.create(
        db,
        transaction_type=TransactionType.DEPOSIT,
        amount_cents=data.amount_cents,  # Positive
        description=data.description,
        category=data.category,
        admin_id=current_user.id
    )
    await db.commit()
    
    admin_name = f"{current_user.firstname or ''} {current_user.lastname or ''}".strip() or current_user.email
    
    return schemas.FinanceTransactionResponse(
        id=tx.id,
        transaction_type=tx.transaction_type.value,
        amount_cents=tx.amount_cents,
        description=tx.description,
        category=tx.category,
        order_id=tx.order_id,
        order_number=None,
        admin_id=tx.admin_id,
        admin_name=admin_name,
        balance_after_cents=tx.balance_after_cents,
        created_at=tx.created_at
    )


@router.post("/withdrawal", response_model=schemas.FinanceTransactionResponse)
async def withdraw_money(
    data: schemas.WithdrawalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Withdraw money from the store."""
    # Check if there's enough balance
    current_balance = await crud_finance.get_current_balance(db)
    if current_balance < data.amount_cents:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Current: {current_balance/100:.2f} ₽, requested: {data.amount_cents/100:.2f} ₽"
        )
    
    tx = await crud_finance.create(
        db,
        transaction_type=TransactionType.WITHDRAWAL,
        amount_cents=-data.amount_cents,  # Negative
        description=data.description,
        category=data.category,
        admin_id=current_user.id
    )
    await db.commit()
    
    admin_name = f"{current_user.firstname or ''} {current_user.lastname or ''}".strip() or current_user.email
    
    return schemas.FinanceTransactionResponse(
        id=tx.id,
        transaction_type=tx.transaction_type.value,
        amount_cents=tx.amount_cents,
        description=tx.description,
        category=tx.category,
        order_id=tx.order_id,
        order_number=None,
        admin_id=tx.admin_id,
        admin_name=admin_name,
        balance_after_cents=tx.balance_after_cents,
        created_at=tx.created_at
    )


@router.post("/expense", response_model=schemas.FinanceTransactionResponse)
async def record_expense(
    data: schemas.ExpenseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Record an expense."""
    tx = await crud_finance.create(
        db,
        transaction_type=TransactionType.EXPENSE,
        amount_cents=-data.amount_cents,  # Negative
        description=data.description,
        category=data.category,
        admin_id=current_user.id
    )
    await db.commit()
    
    admin_name = f"{current_user.firstname or ''} {current_user.lastname or ''}".strip() or current_user.email
    
    return schemas.FinanceTransactionResponse(
        id=tx.id,
        transaction_type=tx.transaction_type.value,
        amount_cents=tx.amount_cents,
        description=tx.description,
        category=tx.category,
        order_id=tx.order_id,
        order_number=None,
        admin_id=tx.admin_id,
        admin_name=admin_name,
        balance_after_cents=tx.balance_after_cents,
        created_at=tx.created_at
    )


@router.post("/adjustment", response_model=schemas.FinanceTransactionResponse)
async def adjust_balance(
    data: schemas.FinanceTransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Adjust balance (correction)."""
    tx = await crud_finance.create(
        db,
        transaction_type=TransactionType.ADJUSTMENT,
        amount_cents=data.amount_cents,
        description=data.description,
        category=data.category,
        admin_id=current_user.id
    )
    await db.commit()
    
    admin_name = f"{current_user.firstname or ''} {current_user.lastname or ''}".strip() or current_user.email
    
    return schemas.FinanceTransactionResponse(
        id=tx.id,
        transaction_type=tx.transaction_type.value,
        amount_cents=tx.amount_cents,
        description=tx.description,
        category=tx.category,
        order_id=tx.order_id,
        order_number=None,
        admin_id=tx.admin_id,
        admin_name=admin_name,
        balance_after_cents=tx.balance_after_cents,
        created_at=tx.created_at
    )


@router.get("/analytics", response_model=schemas.FinanceAnalytics)
async def get_analytics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get finance analytics."""
    # Get balance stats
    balance_stats = await crud_finance.get_balance_stats(db)
    balance = schemas.FinanceBalance(**balance_stats)
    
    # Get expense by category
    expense_by_category = await crud_finance.get_expense_by_category(db, days)
    
    # Get income by type
    income_by_type = await crud_finance.get_income_by_type(db, days)
    
    # Get recent transactions
    transactions, _ = await crud_finance.get_multi(db, limit=10)
    recent = []
    for tx in transactions:
        admin_name = None
        if tx.admin_id:
            admin = await db.get(User, tx.admin_id)
            if admin:
                admin_name = f"{admin.firstname or ''} {admin.lastname or ''}".strip() or admin.email
        
        order_number = None
        if tx.order_id:
            order = await db.get(Order, tx.order_id)
            if order:
                order_number = str(order.id)
        
        recent.append(schemas.FinanceTransactionResponse(
            id=tx.id,
            transaction_type=tx.transaction_type.value,
            amount_cents=tx.amount_cents,
            description=tx.description,
            category=tx.category,
            order_id=tx.order_id,
            order_number=order_number,
            admin_id=tx.admin_id,
            admin_name=admin_name,
            balance_after_cents=tx.balance_after_cents,
            created_at=tx.created_at
        ))
    
    return schemas.FinanceAnalytics(
        balance=balance,
        period_stats=[],  # TODO: implement period stats
        expense_by_category=[
            schemas.FinanceCategoryStats(**cat) for cat in expense_by_category
        ],
        income_by_type=[
            schemas.FinanceCategoryStats(**inc) for inc in income_by_type
        ],
        recent_transactions=recent
    )


@router.get("/categories")
async def get_expense_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get list of expense categories used."""
    from sqlalchemy import distinct, select as sa_select
    from backend.models.finance import FinanceTransaction
    
    result = await db.execute(
        sa_select(distinct(FinanceTransaction.category))
        .where(FinanceTransaction.category.isnot(None))
        .order_by(FinanceTransaction.category)
    )
    categories = [row[0] for row in result.all() if row[0]]
    
    # Add some default categories
    defaults = ["Закупки", "Аренда", "Зарплата", "Реклама", "Доставка", "Упаковка", "Прочее"]
    for cat in defaults:
        if cat not in categories:
            categories.append(cat)
    
    return sorted(categories)
