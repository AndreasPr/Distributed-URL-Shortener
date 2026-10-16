from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
from app.models.url import URL
from app.services.code_generator import CodeGenerator, RandomCodeGenerator

MAX_CODE_ATTEMPTS = 10
# Seven-character static route names must never be allocated as destinations.
RESERVED_CODES = frozenset({"metrics", "shorten"})


class CodeGenerationExhausted(RuntimeError):
    """No candidate could be reserved within the bounded attempt budget."""


class URLRepository:

    def __init__(self, generator: CodeGenerator | None = None):
        self.generator = generator if generator is not None else RandomCodeGenerator()

    def create_with_code(self, db: Session, long_url: str) -> str:
        """Reserve a candidate atomically; the caller owns the transaction."""
        for _ in range(MAX_CODE_ATTEMPTS):
            code = self.generator.generate()
            if code in RESERVED_CODES:
                continue
            statement = (
                insert(URL)
                .values(long_url=long_url, short_code=code)
                .on_conflict_do_nothing(index_elements=[URL.short_code])
                .returning(URL.short_code)
            )
            if db.execute(statement).scalar_one_or_none() is not None:
                return code
        raise CodeGenerationExhausted("Short-code allocation attempts exhausted")

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
