from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from backend.db.session import get_db
from backend.models.user import User
from backend.models.order import Order, OrderStatus
from backend.models.admin_log import AdminActionLog
from admin_backend.core.deps import get_current_admin
from admin_backend.services.analytics import analytics_service
from datetime import datetime, timedelta, timezone

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    
    # Orders Count
    orders_today = await db.scalar(select(func.count(Order.id)).where(Order.created_at >= today_start))
    orders_week = await db.scalar(select(func.count(Order.id)).where(Order.created_at >= week_start))
    
    # Sales Sum (Paid orders) - including delivery
    sales_today = await db.scalar(
        select(func.sum(Order.total_amount_cents + func.coalesce(Order.delivery_cost_cents, 0)))
        .where(Order.created_at >= today_start, Order.status == OrderStatus.PAID)
    ) or 0
    sales_week = await db.scalar(
        select(func.sum(Order.total_amount_cents + func.coalesce(Order.delivery_cost_cents, 0)))
        .where(Order.created_at >= week_start, Order.status == OrderStatus.PAID)
    ) or 0
    
    # New Users
    users_today = await db.scalar(select(func.count(User.id)).where(User.created_at >= today_start))
    users_week = await db.scalar(select(func.count(User.id)).where(User.created_at >= week_start))
    
    # Recent Logs
    logs_result = await db.execute(select(AdminActionLog).order_by(AdminActionLog.created_at.desc()).limit(10))
    logs = logs_result.scalars().all()
    logs_data = [
        {
            "id": log.id,
            "admin_id": log.admin_id,
            "action": log.action,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at
        }
        for log in logs
    ]
    
    # Sales Chart (Last 30 days) - including delivery
    sales_chart_query = (
        select(
            func.date_trunc('day', Order.created_at).label('date'), 
            func.sum(Order.total_amount_cents + func.coalesce(Order.delivery_cost_cents, 0))
        )
        .where(Order.created_at >= month_start, Order.status == OrderStatus.PAID)
        .group_by('date')
        .order_by('date')
    )
    sales_chart_result = await db.execute(sales_chart_query)
    sales_chart = [{"date": row[0], "amount": row[1]} for row in sales_chart_result.all()]
    
    return {
        "orders": {
            "today": orders_today,
            "week": orders_week
        },
        "sales": {
            "today": sales_today,
            "week": sales_week
        },
        "users": {
            "today": users_today,
            "week": users_week
        },
        "logs": logs_data,
        "sales_chart": sales_chart
    }


@router.get("/analytics/sales")
async def get_sales_analytics(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    group_by: str = Query("day", regex="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get detailed sales analytics report.
    
    - **date_from/date_to**: Period filter (defaults to last 30 days)
    - **group_by**: Grouping period (day, week, month)
    """
    return await analytics_service.get_sales_report(
        db, date_from=date_from, date_to=date_to, group_by=group_by
    )


@router.get("/analytics/products")
async def get_top_products(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("quantity", regex="^(quantity|revenue)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get top selling products.
    
    - **limit**: Number of products to return
    - **order_by**: Sort by quantity sold or revenue
    """
    return await analytics_service.get_top_products(
        db, date_from=date_from, date_to=date_to, limit=limit, order_by=order_by
    )


@router.get("/analytics/categories")
async def get_top_categories(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get top selling categories by revenue."""
    return await analytics_service.get_top_categories(
        db, date_from=date_from, date_to=date_to, limit=limit
    )


@router.get("/analytics/users")
async def get_users_analytics(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get user registration and activity analytics."""
    return await analytics_service.get_users_report(
        db, date_from=date_from, date_to=date_to
    )


@router.get("/analytics/funnel")
async def get_conversion_funnel(
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Get order conversion funnel (created → paid → shipped → delivered)."""
    return await analytics_service.get_conversion_funnel(
        db, date_from=date_from, date_to=date_to
    )


@router.get("/inventory/alerts")
async def get_inventory_alerts(
    threshold: int = Query(5, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get products with low stock levels.
    
    - **threshold**: Stock quantity threshold (default: 5)
    """
    return await analytics_service.get_inventory_alerts(
        db, low_stock_threshold=threshold
    )
