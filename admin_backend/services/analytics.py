"""
Analytics service for admin dashboard.
Provides detailed reports and statistics.
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, case
from sqlalchemy.orm import selectinload

from backend.models.order import Order, OrderItem, OrderStatus
from backend.models.user import User
from backend.models.catalog import Product, SKU, Category


class AnalyticsService:
    """Service for generating analytics and reports."""
    
    async def get_sales_report(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        group_by: str = "day"  # day, week, month
    ) -> Dict[str, Any]:
        """
        Get detailed sales report.
        
        Returns:
            - Total revenue
            - Orders count
            - Average order value
            - Chart data grouped by period
        """
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = now - timedelta(days=30)
        if not date_to:
            date_to = now
        
        # Base filter for paid orders
        base_filter = and_(
            Order.created_at >= date_from,
            Order.created_at <= date_to,
            Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED])
        )
        
        # Total metrics
        total_revenue = await db.scalar(
            select(func.sum(Order.total_amount_cents + func.coalesce(Order.delivery_cost_cents, 0))).where(base_filter)
        ) or 0
        
        total_orders = await db.scalar(
            select(func.count(Order.id)).where(base_filter)
        ) or 0
        
        avg_order_value = total_revenue // total_orders if total_orders > 0 else 0
        
        # Chart data
        if group_by == "week":
            date_trunc = func.date_trunc('week', Order.created_at)
        elif group_by == "month":
            date_trunc = func.date_trunc('month', Order.created_at)
        else:
            date_trunc = func.date_trunc('day', Order.created_at)
        
        chart_query = (
            select(
                date_trunc.label('period'),
                func.sum(Order.total_amount_cents + func.coalesce(Order.delivery_cost_cents, 0)).label('revenue'),
                func.count(Order.id).label('orders_count')
            )
            .where(base_filter)
            .group_by('period')
            .order_by('period')
        )
        
        result = await db.execute(chart_query)
        chart_data = [
            {
                "period": row.period.isoformat() if row.period else None,
                "revenue": row.revenue or 0,
                "orders_count": row.orders_count or 0
            }
            for row in result.all()
        ]
        
        # Status breakdown
        status_query = (
            select(
                Order.status,
                func.count(Order.id).label('count'),
                func.sum(Order.total_amount_cents + func.coalesce(Order.delivery_cost_cents, 0)).label('amount')
            )
            .where(Order.created_at >= date_from, Order.created_at <= date_to)
            .group_by(Order.status)
        )
        status_result = await db.execute(status_query)
        status_breakdown = [
            {
                "status": row.status.value if row.status else "unknown",
                "count": row.count,
                "amount": row.amount or 0
            }
            for row in status_result.all()
        ]
        
        return {
            "period": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat()
            },
            "totals": {
                "revenue_cents": total_revenue,
                "orders_count": total_orders,
                "avg_order_value_cents": avg_order_value
            },
            "chart": chart_data,
            "status_breakdown": status_breakdown
        }
    
    async def get_top_products(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 10,
        order_by: str = "quantity"  # quantity, revenue
    ) -> List[Dict[str, Any]]:
        """Get top selling products."""
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = now - timedelta(days=30)
        if not date_to:
            date_to = now
        
        # Join OrderItem with SKU and Product to get product info
        query = (
            select(
                Product.id.label('product_id'),
                Product.title.label('name'),
                func.sum(OrderItem.quantity).label('total_quantity'),
                func.sum(OrderItem.price_cents * OrderItem.quantity).label('total_revenue')
            )
            .join(Order, OrderItem.order_id == Order.id)
            .join(SKU, OrderItem.sku_id == SKU.id)
            .join(Product, SKU.product_id == Product.id)
            .where(
                Order.created_at >= date_from,
                Order.created_at <= date_to,
                Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
            .group_by(Product.id, Product.title)
        )
        
        if order_by == "revenue":
            query = query.order_by(desc('total_revenue'))
        else:
            query = query.order_by(desc('total_quantity'))
        
        query = query.limit(limit)
        
        result = await db.execute(query)
        return [
            {
                "product_id": row.product_id,
                "name": row.name,
                "quantity": row.total_quantity,
                "revenue_cents": row.total_revenue
            }
            for row in result.all()
        ]
    
    async def get_top_categories(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top selling categories."""
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = now - timedelta(days=30)
        if not date_to:
            date_to = now
        
        query = (
            select(
                Category.id,
                Category.name,
                func.sum(OrderItem.quantity).label('total_quantity'),
                func.sum(OrderItem.price_cents * OrderItem.quantity).label('total_revenue')
            )
            .join(Order, OrderItem.order_id == Order.id)
            .join(SKU, OrderItem.sku_id == SKU.id)
            .join(Product, SKU.product_id == Product.id)
            .join(Category, Product.category_id == Category.id)
            .where(
                Order.created_at >= date_from,
                Order.created_at <= date_to,
                Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
            .group_by(Category.id, Category.name)
            .order_by(desc('total_revenue'))
            .limit(limit)
        )
        
        result = await db.execute(query)
        return [
            {
                "category_id": row.id,
                "name": row.name,
                "quantity": row.total_quantity,
                "revenue_cents": row.total_revenue
            }
            for row in result.all()
        ]
    
    async def get_users_report(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get user statistics report."""
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = now - timedelta(days=30)
        if not date_to:
            date_to = now
        
        # New users
        new_users = await db.scalar(
            select(func.count(User.id)).where(
                User.created_at >= date_from,
                User.created_at <= date_to
            )
        ) or 0
        
        # Total users
        total_users = await db.scalar(select(func.count(User.id))) or 0
        
        # Users with orders
        users_with_orders = await db.scalar(
            select(func.count(func.distinct(Order.user_id))).where(
                Order.created_at >= date_from,
                Order.created_at <= date_to
            )
        ) or 0
        
        # Repeat customers (more than 1 order in period)
        repeat_customers_subq = (
            select(Order.user_id)
            .where(Order.created_at >= date_from, Order.created_at <= date_to)
            .group_by(Order.user_id)
            .having(func.count(Order.id) > 1)
        )
        repeat_customers = await db.scalar(
            select(func.count()).select_from(repeat_customers_subq.subquery())
        ) or 0
        
        # Registration chart
        chart_query = (
            select(
                func.date_trunc('day', User.created_at).label('date'),
                func.count(User.id).label('count')
            )
            .where(User.created_at >= date_from, User.created_at <= date_to)
            .group_by('date')
            .order_by('date')
        )
        chart_result = await db.execute(chart_query)
        registration_chart = [
            {"date": row.date.isoformat() if row.date else None, "count": row.count}
            for row in chart_result.all()
        ]
        
        return {
            "period": {
                "from": date_from.isoformat(),
                "to": date_to.isoformat()
            },
            "totals": {
                "total_users": total_users,
                "new_users": new_users,
                "users_with_orders": users_with_orders,
                "repeat_customers": repeat_customers
            },
            "registration_chart": registration_chart
        }
    
    async def get_inventory_alerts(
        self,
        db: AsyncSession,
        low_stock_threshold: int = 5
    ) -> List[Dict[str, Any]]:
        """Get products with low stock."""
        query = (
            select(SKU)
            .options(selectinload(SKU.product))
            .where(SKU.quantity <= low_stock_threshold, SKU.quantity >= 0)
            .order_by(SKU.quantity)
        )
        
        result = await db.execute(query)
        skus = result.scalars().all()
        
        return [
            {
                "sku_id": sku.id,
                "sku_code": sku.sku_code,
                "product_id": sku.product_id,
                "product_name": sku.product.title if sku.product else "Unknown",
                "stock_quantity": sku.quantity,
                "weight_grams": sku.weight,
                "is_critical": sku.quantity == 0
            }
            for sku in skus
        ]
    
    async def get_conversion_funnel(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get order conversion funnel."""
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = now - timedelta(days=30)
        if not date_to:
            date_to = now
        
        base_filter = and_(
            Order.created_at >= date_from,
            Order.created_at <= date_to
        )
        
        # All orders created
        created = await db.scalar(
            select(func.count(Order.id)).where(base_filter)
        ) or 0
        
        # Paid orders
        paid = await db.scalar(
            select(func.count(Order.id)).where(
                base_filter,
                Order.status.in_([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
        ) or 0
        
        # Shipped orders
        shipped = await db.scalar(
            select(func.count(Order.id)).where(
                base_filter,
                Order.status.in_([OrderStatus.SHIPPED, OrderStatus.DELIVERED])
            )
        ) or 0
        
        # Delivered orders
        delivered = await db.scalar(
            select(func.count(Order.id)).where(
                base_filter,
                Order.status == OrderStatus.DELIVERED
            )
        ) or 0
        
        # Cancelled orders
        cancelled = await db.scalar(
            select(func.count(Order.id)).where(
                base_filter,
                Order.status == OrderStatus.CANCELLED
            )
        ) or 0
        
        return {
            "funnel": [
                {"stage": "created", "count": created, "rate": 100},
                {"stage": "paid", "count": paid, "rate": round(paid / created * 100, 1) if created else 0},
                {"stage": "shipped", "count": shipped, "rate": round(shipped / created * 100, 1) if created else 0},
                {"stage": "delivered", "count": delivered, "rate": round(delivered / created * 100, 1) if created else 0},
            ],
            "cancelled": {"count": cancelled, "rate": round(cancelled / created * 100, 1) if created else 0}
        }


analytics_service = AnalyticsService()
