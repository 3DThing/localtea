import redis.asyncio as redis
from backend.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

async def get_counters(entity_type: str, entity_id: int):
    """
    Get views and likes from Redis.
    entity_type: "article" or "product"
    """
    views_key = f"{entity_type}:{entity_id}:views"
    likes_key = f"{entity_type}:{entity_id}:likes"
    
    views = await redis_client.get(views_key)
    likes = await redis_client.get(likes_key)
    
    return {
        "views_count": int(views) if views else 0,
        "likes_count": int(likes) if likes else 0
    }

async def incr_view(entity_type: str, entity_id: int):
    key = f"{entity_type}:{entity_id}:views"
    await redis_client.incr(key)

async def update_likes_cache(entity_type: str, entity_id: int, delta: int):
    key = f"{entity_type}:{entity_id}:likes"
    # Only update if key exists to avoid setting it to just delta if it was missing
    # But for simplicity, if we assume Redis is persistent or we don't care about initial sync miss:
    if await redis_client.exists(key):
        await redis_client.incrby(key, delta)
