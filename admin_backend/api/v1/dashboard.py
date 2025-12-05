from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from backend.db.session import get_db
from backend.models.user import User
from backend.models.order import Order, OrderStatus
from backend.models.admin_log import AdminActionLog
from admin_backend.core.deps import get_current_admin
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
    
    # Sales Sum (Paid orders)
    sales_today = await db.scalar(select(func.sum(Order.total_amount_cents)).where(Order.created_at >= today_start, Order.status == OrderStatus.PAID)) or 0
    sales_week = await db.scalar(select(func.sum(Order.total_amount_cents)).where(Order.created_at >= week_start, Order.status == OrderStatus.PAID)) or 0
    
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
    
    # Sales Chart (Last 30 days)
    # Group by date
    # This is a bit complex in SQL, let's do simple version or use date_trunc
    # Postgres: date_trunc('day', created_at)
    sales_chart_query = (
        select(func.date_trunc('day', Order.created_at).label('date'), func.sum(Order.total_amount_cents))
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
