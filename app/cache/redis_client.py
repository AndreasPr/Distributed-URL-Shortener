import redis

from app.core.config import settings
from app.observability.metrics import record_cache_hit, record_cache_miss

redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
)


def get_cache(key: str):
    value = redis_client.get(key)
    if value is None:
        record_cache_miss()
    else:
        record_cache_hit()
    return value


def set_cache(key: str, value: str, ttl: int = 86400):
    """Set cache with optional TTL (default: 24 hours)."""
    redis_client.set(key, value, ex=ttl)
