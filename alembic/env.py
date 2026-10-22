"""Use application settings; never store credentials in alembic.ini."""

from sqlalchemy import create_engine, pool

from alembic import context
from app.core.config import settings
from app.models.analytics import Analytics
from app.models.api_key import APIKey
from app.models.url import Base

# Import both models to populate the shared metadata.
target_metadata = Base.metadata
assert Analytics.__table__.metadata is target_metadata
assert APIKey.__table__.metadata is target_metadata


def migrate(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    context.configure(
        url=settings.DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    connection = context.config.attributes.get("connection")
    if connection is not None:
        migrate(connection)
    else:
        engine = create_engine(settings.DB_URL, poolclass=pool.NullPool)
        try:
            with engine.connect() as connection:
                migrate(connection)
        finally:
            engine.dispose()
