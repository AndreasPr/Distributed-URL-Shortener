from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create engine lazily and defensively to avoid import-time crashes in hostile
# environments where DATABASE_URL may be missing or unreachable.
try:
    engine = create_engine(
        settings.DB_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as exc:  # pragma: no cover - defensive
    logger.exception("Failed to create DB engine at import: %s", exc)
    engine = None
    SessionLocal = None


def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
