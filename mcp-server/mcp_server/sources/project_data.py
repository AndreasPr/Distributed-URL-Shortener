import datetime
import logging
from typing import Any

from sqlalchemy import text
from app.db.database import SessionLocal
from app.cache.redis_client import redis_client
from app.repositories.url_repository import URLRepository

from mcp_server.config import settings
from mcp_server.errors import SourceError
from mcp_server.models.metrics import CacheStats, ClickStats, RateLimitSignals

logger = logging.getLogger(__name__)

url_repo = URLRepository()


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _window_start(window_minutes: int) -> datetime.datetime:
    return _utc_now() - datetime.timedelta(minutes=window_minutes)


def _to_utc_iso(dt: datetime.datetime) -> str:
    return dt.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def get_click_stats(short_code: str, window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES) -> dict[str, Any]:
    try:
        with SessionLocal() as db:
            start = _window_start(window_minutes)
            result = db.execute(
                text(
                    "SELECT clicked_at FROM analytics WHERE short_code = :short_code AND clicked_at >= :start ORDER BY clicked_at ASC"
                ),
                {"short_code": short_code, "start": start},
            )
            rows = [row[0].astimezone(datetime.timezone.utc) for row in result.fetchall()]
            timestamps = [_to_utc_iso(row) for row in rows]
            click_count = len(rows)
            velocity = 0.0
            if click_count > 1:
                duration_seconds = (rows[-1] - rows[0]).total_seconds()
                velocity = click_count / max(duration_seconds, 1)

            baseline_start = _window_start(window_minutes + settings.BASELINE_HISTORY_MINUTES)
            baseline_result = db.execute(
                text(
                    "SELECT COUNT(*) FROM analytics WHERE short_code = :short_code AND clicked_at >= :baseline_start AND clicked_at < :start"
                ),
                {"short_code": short_code, "baseline_start": baseline_start, "start": start},
            )
            baseline_click_count = int(baseline_result.scalar() or 0)
            baseline_duration = settings.BASELINE_HISTORY_MINUTES * 60
            rolling_average_velocity = baseline_click_count / max(baseline_duration, 1)
            long_url = url_repo.get_by_code(db, short_code)
            return ClickStats(
                short_code=short_code,
                click_count=click_count,
                click_velocity=velocity,
                timestamps=timestamps,
                analysis_window_minutes=window_minutes,
                rolling_average_velocity=rolling_average_velocity,
                long_url=long_url.long_url if long_url else None,
            ).model_dump()
    except Exception as exc:
        logger.exception("Project data click stats failure for %s", short_code)
        raise SourceError("project_data", "click_stats_failure", details=str(exc))


def get_top_short_codes(window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES, limit: int = 5) -> list[str]:
    try:
        with SessionLocal() as db:
            start = _window_start(window_minutes)
            result = db.execute(
                text(
                    "SELECT short_code, COUNT(*) AS click_count "
                    "FROM analytics "
                    "WHERE clicked_at >= :start "
                    "GROUP BY short_code "
                    "ORDER BY click_count DESC "
                    "LIMIT :limit"
                ),
                {"start": start, "limit": limit},
            )
            return [row[0] for row in result.fetchall() if row[0]]
    except Exception as exc:
        logger.exception("Project data top short codes failure")
        raise SourceError("project_data", "top_short_codes_failure", details=str(exc))


def get_rate_limit_signals(short_code: str | None = None, window_minutes: int = settings.MCP_ABUSE_WINDOW_MINUTES) -> dict[str, Any]:
    try:
        if redis_client is None or not hasattr(redis_client, "scan_iter"):
            raise RuntimeError("Redis client not configured")

        now_ms = int(_utc_now().timestamp() * 1000)
        start_ms = int(_window_start(window_minutes).timestamp() * 1000)
        trigger_count = 0
        recent_triggers: list[str] = []

        key_pattern = "rate_limit:sw:/shorten:*"
        for raw_key in redis_client.scan_iter(match=key_pattern):
            key = raw_key.decode() if isinstance(raw_key, bytes) else str(raw_key)
            key_count = redis_client.zcount(key, start_ms, now_ms)
            trigger_count += int(key_count or 0)
            if len(recent_triggers) < settings.RATE_LIMIT_TRIGGER_THRESHOLD:
                values = redis_client.zrangebyscore(key, start_ms, now_ms)
                recent_triggers.extend(
                    _to_utc_iso(datetime.datetime.fromtimestamp(int(item) / 1000, tz=datetime.timezone.utc))
                    for item in values[-settings.RATE_LIMIT_TRIGGER_THRESHOLD:]
                )

        suspicious = trigger_count >= settings.SUSPECTED_BOT_PATTERN_THRESHOLD

        return RateLimitSignals(
            short_code=short_code or "",
            trigger_count=trigger_count,
            suspicious_pattern=suspicious,
            window_minutes=window_minutes,
            recent_triggers=recent_triggers[: settings.RATE_LIMIT_TRIGGER_THRESHOLD],
        ).model_dump()
    except Exception as exc:
        logger.exception("Project data rate limit signal failure for %s", short_code)
        raise SourceError("project_data", "rate_limit_failure", details=str(exc))


def get_cache_stats(short_code: str | None = None) -> dict[str, Any]:
    try:
        if redis_client is None:
            raise RuntimeError("Redis client not configured")

        available = False
        dbsize = None
        key_exists = None

        try:
            available = redis_client.ping() is not False
            dbsize = redis_client.dbsize()
            if short_code:
                key_exists = bool(redis_client.exists(short_code))
        except Exception:
            available = False

        return CacheStats(
            redis_available=available,
            dbsize=dbsize,
            cache_hit_ratio=None,
            short_code=short_code,
        ).model_dump()
    except Exception as exc:
        logger.exception("Project data cache stats failure")
        raise SourceError("project_data", "cache_stats_failure", details=str(exc))
