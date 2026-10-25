"""Bounded per-code telemetry; independent of token-bucket storage format."""

import re
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.cache import redis_client as cache
from app.models.analytics import Analytics

CODE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
# Dedicated minute counters expire after the maximum supported window plus slack.
RECORD_LUA = """
local count = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 3660)
return count
"""


def record_rejection(code: str) -> None:
    if not CODE.fullmatch(code):
        return
    minute = int(time.time()) // 60
    try:
        cache.read_cache(
            lambda: cache.redis_client.eval(
                RECORD_LUA, 1, f"activity:429:{code}:{minute}"
            )
        )
    except Exception:
        # Telemetry must never change the limiter's response.
        pass


def signals(db: Session, code: str, window_minutes: int) -> dict:
    # Completed minute buckets give an explicit aligned interval, not a claim of
    # millisecond precision. Analytics may lag because clicks are asynchronous.
    minute = int(time.time()) // 60
    end = datetime.fromtimestamp(minute * 60, timezone.utc).replace(tzinfo=None)
    start = end - timedelta(minutes=window_minutes)
    status = {"analytics": "ok", "rate_limits": "ok"}
    clicks = baseline = None
    try:
        clicks = (
            db.query(func.count(Analytics.id))
            .filter(
                Analytics.short_code == code,
                Analytics.clicked_at >= start,
                Analytics.clicked_at < end,
            )
            .scalar()
            or 0
        )
        baseline = (
            db.query(func.count(Analytics.id))
            .filter(
                Analytics.short_code == code,
                Analytics.clicked_at >= start - timedelta(days=1),
                Analytics.clicked_at < start,
            )
            .scalar()
            or 0
        )
    except Exception:
        db.rollback()
        status["analytics"] = "failed"
    keys = [f"activity:429:{code}:{m}" for m in range(minute - window_minutes, minute)]
    try:
        counts = cache.read_cache(lambda: cache.redis_client.mget(keys))
        if counts is None:
            raise ConnectionError
        rejections = sum(int(value or 0) for value in counts)
    except Exception:
        rejections = None
        status["rate_limits"] = "failed"
    return {
        "short_code": code,
        "window_minutes": window_minutes,
        "window_start": start.isoformat() + "Z",
        "window_end": end.isoformat() + "Z",
        "click_count": clicks,
        "click_velocity": (
            clicks / (window_minutes * 60) if clicks is not None else None
        ),
        "rolling_average_velocity": baseline / 86400 if baseline is not None else None,
        "rate_limit_rejections": rejections,
        "sources_status": status,
        "coverage": "best_effort_since_deployment; completed_minutes; async_clicks",
    }
