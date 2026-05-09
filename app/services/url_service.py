from sqlalchemy.orm import Session
from repositories.url_repository import URLRepository
from utils.base62 import encode_base62
from cache.redis_client import get_cache, set_cache

class URLService:
    def __init__(self):
        self.repo = URLRepository()
        self.CACHE_TTL = 86400  
    
    def shorten(self, db: Session, long_url: str) -> str:
        """Create a short URL in a single database transaction."""
        long_url_str = str(long_url)
        url = self.repo.create(db, long_url_str)
        code = encode_base62(url.id)
        self.repo.update_code(db, url, code)
        db.commit() 
        return code
    
    def resolve(self, db: Session, code: str) -> str:
        """Resolve short code to long URL with caching."""
        cached = get_cache(code)
        if cached:
            return cached.decode()

        url = self.repo.get_by_code(db, code)
        if not url:
            return None
        
        # Cache for 24 hours
        set_cache(code, url.long_url, ttl=self.CACHE_TTL)
        
        return url.long_url