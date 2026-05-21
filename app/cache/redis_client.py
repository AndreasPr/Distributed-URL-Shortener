import logging

try:
    import redis
except Exception:  # pragma: no cover - defensive
    redis = None

from app.core.config import settings
from app.observability.metrics import record_cache_hit, record_cache_miss

logger = logging.getLogger(__name__)


class _NullRedis:
    def get(self, *_a, **_kw):
        return None

    def set(self, *a, **k):
        return None

    def ping(self):
        return False

    def dbsize(self):
        return 0


def _create_client():
    if redis is None:
        logger.warning("redis library not available; using NullRedis")
        return _NullRedis()
    try:
        return redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    except Exception:
        logger.exception("Failed to create Redis client; using NullRedis")
        return _NullRedis()


redis_client = _create_client()


def get_cache(key: str):
    value = redis_client.get(key)
    if value is None:
        record_cache_miss()
    else:
        record_cache_hit()
    return value


def set_cache(key: str, value: str, ttl: int = 86400):
    """Set cache with optional TTL (default: 24 hours)."""
    try:
        redis_client.set(key, value, ex=ttl)
    except Exception:
        logger.exception("Failed to set cache")
