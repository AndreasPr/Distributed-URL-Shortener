from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
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

    def list_recent(self, db: Session, limit: int = 20):
        rows = (
            db.query(
                URL.short_code,
                URL.long_url,
                URL.created_at,
                func.count(Analytics.id).label("click_count"),
            )
            .outerjoin(Analytics, URL.short_code == Analytics.short_code)
            .group_by(URL.id)
            .order_by(URL.created_at.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "short_code": row.short_code,
                "long_url": row.long_url,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "click_count": int(row.click_count or 0),
            }
            for row in rows
        ]
