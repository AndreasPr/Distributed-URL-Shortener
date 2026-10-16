import logging
from datetime import datetime, timezone
from urllib.parse import urlsplit

from opentelemetry import trace
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.cache.redis_client import delete_cache, get_cache, set_cache
from app.kafka.producer import publish_click_event
from app.observability.metrics import track_shorten_latency
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
                span.set_attribute("url.code", code)
                return code

    def resolve(self, db: Session, code: str) -> str | None:
        """Resolve short code to long URL with caching."""
        with tracer.start_as_current_span("url.resolve") as span:
            span.set_attribute("url.code", code)

            # A shared row lock orders this redirect before a concurrent delete.
            # Always check lifecycle in PostgreSQL: eviction can fail or race.
            url = self.repo.get_by_code(db, code)
            if url is None or url.deleted_at is not None:
                delete_cache(code)
                return None
            self._check_expiry(url.expires_at)
            cached = get_cache(code)
            if isinstance(cached, bytes):
                cached = cached.decode()
            hit = cached == url.long_url
            span.set_attribute("cache.hit", hit)
            if not hit:
                if url.expires_at is None:
                    set_cache(code, url.long_url, ttl=self.CACHE_TTL)
                else:
                    deadline = int(
                        url.expires_at.replace(tzinfo=timezone.utc).timestamp() * 1000
                    )
                    remaining = int(
                        (
                            url.expires_at
                            - datetime.now(timezone.utc).replace(tzinfo=None)
                        ).total_seconds()
                    )
                    if remaining > 0:
                        set_cache(
                            code,
                            url.long_url,
                            ttl=min(self.CACHE_TTL, remaining),
                            expires_at_ms=deadline,
                        )
            self._record_click(code)
            # Kafka publication can block; do not redirect if it crossed expiry.
            self._check_expiry(url.expires_at)
            _record_url_origin(span, url.long_url)
            return url.long_url

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
