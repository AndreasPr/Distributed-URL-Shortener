from sqlalchemy.orm import Session

from app.cache.redis_client import get_cache, set_cache
from app.kafka.producer import publish_click_event
from app.observability.metrics import track_shorten_latency
from app.repositories.url_repository import URLRepository

class URLService:
    def __init__(self):
        self.repo = URLRepository()
        self.CACHE_TTL = 86400  
    
    def shorten(self, db: Session, long_url: str) -> str:
        """Create a short URL and return the code."""
        long_url_str = str(long_url)
        with track_shorten_latency():
            code = self.repo.create_with_code(db, long_url_str)
            db.commit()
            return code
    
    def resolve(self, db: Session, code: str) -> str:
        """Resolve short code to long URL with caching."""
        cached = get_cache(code)
        if cached:
            publish_click_event(code)
            return cached.decode() if isinstance(cached, bytes) else cached

        url = self.repo.get_by_code(db, code)
        if not url:
            return None
        
        # Cache for 24 hours
        set_cache(code, url.long_url, ttl=self.CACHE_TTL)
        publish_click_event(code)
        return url.long_url