from sqlalchemy.orm import Session
from opentelemetry import trace

from app.cache.redis_client import get_cache, set_cache
from app.kafka.producer import publish_click_event
from app.observability.metrics import track_shorten_latency
from app.repositories.url_repository import URLRepository

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
                publish_click_event(code)
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

            publish_click_event(code)
            span.set_attribute("url.output", url.long_url)
            return url.long_url
