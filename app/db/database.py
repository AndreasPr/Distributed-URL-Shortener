import logging

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create engine lazily and defensively to avoid import-time crashes in hostile
# environments where DATABASE_URL may be missing or unreachable.
engine: Engine | None
SessionLocal: sessionmaker[Session] | None

try:
    engine = create_engine(
        settings.DB_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=2 if settings.APP_ROLE == "all" else 10,
        pool_recycle=300 if settings.APP_ROLE == "all" else -1,
        pool_timeout=5,
        connect_args={
            "connect_timeout": 5,
            **(
                {}
                if settings.APP_ROLE == "all"
                else {"options": "-c statement_timeout=5000 -c lock_timeout=2000"}
            ),
        },
    )

    @event.listens_for(engine, "begin")
    def transaction_limits(connection):
        # SET LOCAL is transaction-scoped, compatible with transaction poolers.
        if settings.APP_ROLE != "all":
            return
        connection.exec_driver_sql("SET LOCAL statement_timeout = '5000ms'")
        connection.exec_driver_sql("SET LOCAL lock_timeout = '2000ms'")

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
