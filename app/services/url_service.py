import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlsplit

from opentelemetry import trace
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.cache.redis_client import acquire_lock, get_cache
from app.cache.redis_client import invalidate_cache as delete_cache
from app.cache.redis_client import release_lock, set_cache
from app.cache.singleflight import SingleFlight
from app.kafka.producer import publish_click_event
from app.observability.metrics import (
    cache_fallback_total,
    cache_lock_wait_total,
    negative_cache_hits_total,
    track_shorten_latency,
)
from app.repositories.url_repository import URLRepository
from app.services.code_generator import CodeGenerator

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


def _record_url_origin(span: trace.Span, url: str) -> None:
    """Never attach credentials, paths, queries, or fragments to spans."""
    try:
        parsed = urlsplit(url)
        host = parsed.hostname
    except ValueError:
        return
    span.set_attribute("url.scheme", parsed.scheme)
    if host:
        span.set_attribute("url.host", host)


class LinkExpiredError(ValueError):
    """The destination is no longer available because it expired."""


@dataclass(frozen=True)
class Destination:
    long_url: str | None
    expires_at: datetime | None = None


loads: SingleFlight[Destination] = SingleFlight()
NEGATIVE_TTL = 30
LOCK_WAIT_SECONDS = 0.2


def _decode_cache(raw) -> Destination | None:
    if not isinstance(raw, (str, bytes)):
        return None
    try:
        value = json.loads(raw)
        if not isinstance(value, dict) or value.get("version") != 1:
            return None
        if value.get("kind") == "missing":
            if float(value["until"]) > time.time():
                negative_cache_hits_total.inc()
                return Destination(None)
            return None
        if value.get("kind") == "url" and isinstance(value.get("url"), str):
            expiry = value.get("expires_at")
            parsed = datetime.fromisoformat(expiry) if expiry is not None else None
            if parsed is not None and parsed.tzinfo is not None:
                return None
            return Destination(value["url"], parsed)
    except (ValueError, TypeError, KeyError, UnicodeError):
        pass
    # Legacy raw URL entries are reloaded and upgraded, never blindly trusted.
    return None


class URLService:
    def __init__(self, generator: CodeGenerator | None = None):
        self.repo = URLRepository(generator)
        self.CACHE_TTL = 86400

    def shorten(
        self,
        db: Session,
        long_url: str | HttpUrl,
        custom_alias: str | None = None,
        expires_at: datetime | None = None,
    ) -> str:
        """Create a short URL and return the code."""
        with tracer.start_as_current_span("url.shorten") as span:
            _record_url_origin(span, str(long_url))
            long_url_str = str(long_url)
            with track_shorten_latency():
                if custom_alias is None and expires_at is None:
                    code = self.repo.create_with_code(db, long_url_str)
                else:
                    expiry = (
                        expires_at.astimezone(timezone.utc).replace(tzinfo=None)
                        if expires_at
                        else None
                    )
                    code = self.repo.create_with_code(
                        db, long_url_str, custom_alias, expiry
                    )
                db.commit()
                loads.invalidate(code)
                delete_cache(code)
                span.set_attribute("url.code", code)
                return code

    def resolve(self, db: Session, code: str) -> str | None:
        """Coalesce overlapping requests without retaining an in-process cache."""
        with tracer.start_as_current_span("url.resolve") as span:
            span.set_attribute("url.code", code)
            destination = loads.run(code, lambda: self._load(db, code))
            if destination.long_url is None:
                return None
            self._check_expiry(destination.expires_at)
            self._record_click(code)
            self._check_expiry(destination.expires_at)
            _record_url_origin(span, destination.long_url)
            return destination.long_url

    def _cached_destination(self, db: Session, code: str) -> Destination | None:
        entry = _decode_cache(get_cache(code))
        if entry is None or entry.long_url is None:
            return entry
        # Positive hits retain Step 1.3's fail-closed deletion guarantee.
        lifecycle = self.repo.get_lifecycle(db, code)
        if lifecycle is None or lifecycle[0] is not None:
            delete_cache(code)
            return Destination(None)
        return Destination(entry.long_url, lifecycle[1])

    def _load(self, db: Session, code: str) -> Destination:
        cached = self._cached_destination(db, code)
        if cached is not None:
            return cached
        token, reachable = acquire_lock(code)
        if token is None and reachable:
            cache_lock_wait_total.inc()
            deadline = time.monotonic() + LOCK_WAIT_SECONDS
            while time.monotonic() < deadline:
                time.sleep(0.01)
                cached = self._cached_destination(db, code)
                if cached is not None:
                    return cached
            # Lease/load may be stalled. Do not make Redis a hard dependency.
            cache_fallback_total.inc()
        elif not reachable:
            cache_fallback_total.inc()
        try:
            if token is not None:
                # Another loader may have filled the cache before SET NX won.
                cached = self._cached_destination(db, code)
                if cached is not None:
                    return cached
            row = self.repo.get_by_code(db, code)
            if row is None or row.deleted_at is not None:
                result = Destination(None)
                if token is not None:
                    set_cache(
                        code,
                        json.dumps(
                            {
                                "version": 1,
                                "kind": "missing",
                                "until": time.time() + NEGATIVE_TTL,
                            }
                        ),
                        ttl=NEGATIVE_TTL,
                        lock_token=token,
                        jitter=False,
                    )
                return result
            result = Destination(row.long_url, row.expires_at)
            if token is not None:
                expiry_ms = (
                    int(row.expires_at.replace(tzinfo=timezone.utc).timestamp() * 1000)
                    if row.expires_at is not None
                    else None
                )
                # Do not populate an expired/subsecond entry.
                if expiry_ms is None or expiry_ms - int(time.time() * 1000) >= 1000:
                    set_cache(
                        code,
                        json.dumps(
                            {
                                "version": 1,
                                "kind": "url",
                                "url": row.long_url,
                                "expires_at": (
                                    row.expires_at.isoformat()
                                    if row.expires_at
                                    else None
                                ),
                            }
                        ),
                        ttl=self.CACHE_TTL,
                        expires_at_ms=expiry_ms,
                        lock_token=token,
                    )
            return result
        finally:
            if token is not None:
                release_lock(code, token)

    @staticmethod
    def _check_expiry(expires_at: datetime | None) -> None:
        if expires_at is not None and expires_at <= datetime.now(timezone.utc).replace(
            tzinfo=None
        ):
            raise LinkExpiredError("Link has expired")

    def delete(self, db: Session, code: str) -> bool:
        if not self.repo.soft_delete(db, code):
            return False
        db.commit()
        loads.invalidate(code)
        delete_cache(code)
        return True

    def _record_click(self, short_code: str) -> None:
        """Publish a click event best-effort without blocking redirects."""
        try:
            publish_click_event(short_code)
        except Exception:
            logger.exception("Failed to record click for short_code=%s", short_code)

    def list_recent_urls(self, db: Session, limit: int = 20):
        """List recent URLs with click counts for dashboard views."""
        return self.repo.list_recent(db, limit=limit)
