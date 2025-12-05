from fastapi import APIRouter
from backend.api.v1.user import endpoints as user_endpoints
from backend.api.v1.catalog import endpoints as catalog_endpoints
from backend.api.v1.cart import endpoints as cart_endpoints
from backend.api.v1.order import endpoints as order_endpoints
from backend.api.v1.webhooks import endpoints as webhook_endpoints
from backend.api.v1.blog import endpoints as blog_endpoints
from backend.api.v1.interactions import endpoints as interactions_endpoints

api_router = APIRouter()
api_router.include_router(user_endpoints.router, prefix="/user", tags=["user"])
api_router.include_router(catalog_endpoints.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(cart_endpoints.router, prefix="/cart", tags=["cart"])
api_router.include_router(order_endpoints.router, prefix="/orders", tags=["orders"])
api_router.include_router(webhook_endpoints.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(blog_endpoints.router, prefix="/blog", tags=["blog"])
api_router.include_router(interactions_endpoints.router, prefix="/interactions", tags=["interactions"])




