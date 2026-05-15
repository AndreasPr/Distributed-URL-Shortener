from sqlalchemy.orm import Session

from app.models.url import URL
from app.utils.base62 import encode_base62


class URLRepository:

    def create_with_code(self, db: Session, long_url: str) -> str:
        """Create a URL and generate its short code in a single atomic operation.
        Returns the short code.
        """
        url = URL(long_url=long_url)
        db.add(url)
        db.flush()  # Get ID without committing
        code = encode_base62(url.id)
        url.short_code = code
        return code

    def get_by_code(self, db: Session, code: str):
        return db.query(URL).filter(URL.short_code == code).first()
