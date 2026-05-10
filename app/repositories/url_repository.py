from sqlalchemy.orm import Session
from app.models.url import URL

class URLRepository:
    
    def create(self, db: Session, long_url: str):
        url = URL(long_url=long_url)
        db.add(url)
        db.flush()  # Get ID without committing yet
        return url

    def update_code(self, db: Session, url: URL, code: str):
        url.short_code = code
        # Don't commit here; let caller manage transaction
        return url
    
    def get_by_code(self, db: Session, code: str):
        return db.query(URL).filter(URL.short_code == code).first()
    