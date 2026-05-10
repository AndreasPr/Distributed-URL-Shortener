import redis
from app.core.config import settings

redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)

def get_cache(key: str):
    return redis_client.get(key)

def set_cache(key: str, value: str, ttl: int = 86400):
    """Set cache with optional TTL (default: 24 hours)."""
    redis_client.set(key, value, ex=ttl)