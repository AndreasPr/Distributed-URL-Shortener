"""Atomic migration transaction and lock, including through transaction poolers."""

from sqlalchemy import create_engine, pool, text

from alembic import command
from alembic.config import Config
from app.core.config import settings

MIGRATION_LOCK = 831517423


def migrate() -> None:
    engine = create_engine(
        settings.DB_URL,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 2},
    )
    try:
        with engine.begin() as connection:
            connection.execute(text("SET LOCAL statement_timeout = '60000ms'"))
            connection.execute(text("SET LOCAL lock_timeout = '2000ms'"))
            # Transaction-scoped locks cannot leak to another pooler client.
            connection.execute(
                text("SELECT pg_advisory_xact_lock(:key)"), {"key": MIGRATION_LOCK}
            )
            config = Config("alembic.ini")
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
    finally:
        engine.dispose()
