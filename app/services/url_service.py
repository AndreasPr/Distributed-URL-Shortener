import logging

from opentelemetry import trace
from sqlalchemy.orm import Session

from app.cache.redis_client import get_cache, set_cache
from app.kafka.producer import publish_click_event
from app.observability.metrics import track_shorten_latency
from app.repositories.url_repository import URLRepository

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class URLService:
    def __init__(self):
        self.repo = URLRepository()
        self.CACHE_TTL = 86400

    def shorten(self, db: Session, long_url: str) -> str:
        """Create a short URL and return the code."""
        with tracer.start_as_current_span("url.shorten") as span:
            span.set_attribute("url.input", str(long_url))
            long_url_str = str(long_url)
            with track_shorten_latency():
                code = self.repo.create_with_code(db, long_url_str)
                db.commit()
                span.set_attribute("url.code", code)
                return code

    def resolve(self, db: Session, code: str) -> str:
        """Resolve short code to long URL with caching."""
        with tracer.start_as_current_span("url.resolve") as span:
            span.set_attribute("url.code", code)

            # Try cache first
            with tracer.start_as_current_span("cache.get"):
                cached = get_cache(code)

            if cached:
                span.set_attribute("cache.hit", True)
                self._record_click(code)
                return cached.decode() if isinstance(cached, bytes) else cached

            # Cache miss - query database
            span.set_attribute("cache.hit", False)
            with tracer.start_as_current_span("db.query_url"):
                url = self.repo.get_by_code(db, code)

            if not url:
                return None

            # Cache for 24 hours
            with tracer.start_as_current_span("cache.set"):
                set_cache(code, url.long_url, ttl=self.CACHE_TTL)

            self._record_click(code)
            span.set_attribute("url.output", url.long_url)
            return url.long_url

    def _record_click(self, short_code: str) -> None:
        """Publish a click event best-effort without blocking redirects."""
        try:
            publish_click_event(short_code)
        except Exception:
            logger.exception("Failed to record click for short_code=%s", short_code)

    def list_recent_urls(self, db: Session, limit: int = 20):
        """List recent URLs with click counts for dashboard views."""
        return self.repo.list_recent(db, limit=limit)
